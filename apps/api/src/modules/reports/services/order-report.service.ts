import { Injectable, Logger, NotFoundException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { OrderPdfService } from "src/modules/orders/order-pdf.service";
// biome-ignore lint/style/useImportType: Nest DI requires the runtime class.
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
// biome-ignore lint/style/useImportType: <explanation>
import { UploadFileService } from "src/shared/upload/upload-file.service";

@Injectable()
export class OrderReportService {
  private readonly logger = new Logger(OrderReportService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly helpersService: HelpersService,
    private readonly uploadFileService: UploadFileService,
    private readonly orderPdfService: OrderPdfService,
  ) {}

  async generate(
    orderId: string,
    requestedByUserId: string,
  ): Promise<{ filename: string; publicUrl: string }> {
    const order = await this.prismaService.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        friendlyCode: true,
        event: true,
        observation: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        user: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        orderItem: {
          select: {
            quantity: true,
            product: {
              select: {
                name: true,
                category: { select: { name: true } },
                unity: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const requester = await this.prismaService.user.findUnique({
      where: { id: requestedByUserId },
      select: { name: true },
    });

    const pdfBytes = await this.orderPdfService.build(order, {
      generatedByName: requester?.name ?? order.user.name,
    });

    const filename = `cozinha/pedidos/relatorio-pedido-${orderId.toLowerCase()}.pdf`;
    await this.uploadFileService.uploadFile(filename, pdfBytes);
    this.logger.log(`Uploaded order report ${orderId} → ${filename}`);

    await this.prismaService.orderReports.create({
      data: {
        id: this.helpersService.generateId(),
        url: filename,
        order: { connect: { id: orderId } },
        user: { connect: { id: requestedByUserId } },
      },
    });

    return {
      filename,
      publicUrl: this.uploadFileService.getFileUrl(filename),
    };
  }
}
