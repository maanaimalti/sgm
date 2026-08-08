import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { reportStatus } from "@prisma/client";
// biome-ignore lint/style/useImportType: Nest DI requires the runtime class.
import { NotificationService } from "src/modules/notification/notification.service";
// biome-ignore lint/style/useImportType: <explanation>
import { ReportsService } from "../reports.service";
// biome-ignore lint/style/useImportType: <explanation>
import { OrderReportService } from "./order-report.service";
// biome-ignore lint/style/useImportType: <explanation>
import { ProductReportService } from "./product-report.service";

type ReportEventPayload = {
  reportId: string;
  type: string;
  userId: string;
  departmentId?: string;
  parameters: any;
};

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly productReportService: ProductReportService,
    private readonly orderReportService: OrderReportService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent("report.generate")
  async handleReportGeneration(payload: ReportEventPayload) {
    this.logger.log(
      `Processing ${payload.type} report ${payload.reportId} for user ${payload.userId}`,
    );

    try {
      await this.reportsService.updateReportStatus(
        payload.reportId,
        reportStatus.PROCESSING,
      );

      let filePath: string;
      let extraMetadata: Record<string, unknown> = {};

      switch (payload.type) {
        case "PRODUCTS":
          filePath = await this.productReportService.generateProductReport(
            payload.reportId,
            payload.userId,
            payload.departmentId,
            payload.parameters,
          );
          break;
        case "ORDERS": {
          const orderId =
            typeof payload.parameters === "string"
              ? JSON.parse(payload.parameters).orderId
              : payload.parameters?.orderId;
          if (!orderId) {
            throw new Error("ORDERS report requires parameters.orderId");
          }
          const result = await this.orderReportService.generate(
            orderId,
            payload.userId,
          );
          filePath = result.filename;
          extraMetadata = { orderId };
          break;
        }
        case "MOVEMENTS":
        case "STOCK":
        case "USERS":
          throw new Error(`${payload.type} reports not implemented yet`);
        default:
          throw new Error(`Unknown report type: ${payload.type}`);
      }

      await this.reportsService.updateReportStatus(
        payload.reportId,
        reportStatus.COMPLETED,
        filePath,
      );

      const reportTypeName = this.getReportTypeName(payload.type);
      await this.notificationService.create({
        text:
          payload.type === "ORDERS"
            ? `Relatório do pedido está pronto para download`
            : `Seu relatório de ${reportTypeName} está pronto para download`,
        type: "REPORT_READY",
        to: payload.userId,
        metadata: JSON.stringify({
          reportId: payload.reportId,
          downloadUrl: filePath,
          reportType: payload.type,
          ...extraMetadata,
        }),
      });

      this.logger.log(`Report ${payload.reportId} completed`);
    } catch (error) {
      this.logger.error(
        `Report generation failed for ${payload.reportId}`,
        error?.stack ?? error?.message ?? error,
      );

      const rawMessage = error?.message ?? String(error);
      await this.reportsService.updateReportStatus(
        payload.reportId,
        reportStatus.FAILED,
        undefined,
        rawMessage.slice(0, 180),
      );

      const reportTypeName = this.getReportTypeName(payload.type);
      const orderId =
        payload.type === "ORDERS"
          ? typeof payload.parameters === "string"
            ? JSON.parse(payload.parameters).orderId
            : payload.parameters?.orderId
          : undefined;
      await this.notificationService.create({
        text: `Falha ao gerar relatório de ${reportTypeName}: ${error?.message ?? "erro desconhecido"}`,
        type: "REPORT_FAILED",
        to: payload.userId,
        metadata: orderId
          ? JSON.stringify({ orderId, errorMessage: error?.message })
          : undefined,
      });
    }
  }

  private getReportTypeName(type: string): string {
    const typeNames = {
      PRODUCTS: "produtos",
      ORDERS: "pedidos",
      MOVEMENTS: "movimentações",
      STOCK: "estoque",
      USERS: "usuários",
    };
    return typeNames[type] || "relatório";
  }
}
