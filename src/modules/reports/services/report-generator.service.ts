import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { reportStatus } from '@prisma/client';
import { NotificationService } from 'src/modules/notification/notification.service';
import { ReportsService } from '../reports.service';
import { ProductReportService } from './product-report.service';

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly productReportService: ProductReportService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent('report.generate')
  async handleReportGeneration(payload: {
    reportId: string;
    type: string;
    userId: string;
    departmentId?: string;
    parameters: any;
  }) {
    this.logger.log(`Processing report generation for ${payload.reportId}`);

    try {
      // Update status to PROCESSING
      await this.reportsService.updateReportStatus(
        payload.reportId,
        reportStatus.PROCESSING,
      );

      let filePath: string;

      // Route to specific report generator based on type
      switch (payload.type) {
        case 'PRODUCTS':
          filePath = await this.productReportService.generateProductReport(
            payload.reportId,
            payload.userId,
            payload.departmentId,
            payload.parameters,
          );
          break;
        case 'ORDERS':
          // TODO: Implement order report generator
          throw new Error('Order reports not implemented yet');
        case 'MOVEMENTS':
          // TODO: Implement movement report generator
          throw new Error('Movement reports not implemented yet');
        case 'STOCK':
          // TODO: Implement stock report generator
          throw new Error('Stock reports not implemented yet');
        case 'USERS':
          // TODO: Implement user report generator
          throw new Error('User reports not implemented yet');
        default:
          throw new Error(`Unknown report type: ${payload.type}`);
      }

      // Update status to COMPLETED with file path
      await this.reportsService.updateReportStatus(
        payload.reportId,
        reportStatus.COMPLETED,
        filePath,
      );

      // Send notification to user with download URL
      const reportTypeName = this.getReportTypeName(payload.type);
      await this.notificationService.create({
        text: `Seu relatório de ${reportTypeName} está pronto para download`,
        type: 'REPORT_READY',
        to: payload.userId,
        metadata: JSON.stringify({
          reportId: payload.reportId,
          downloadUrl: filePath,
          reportType: payload.type,
        }),
      });

      this.logger.log(`Report ${payload.reportId} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Report generation failed for ${payload.reportId}:`,
        error.message,
      );

      // Update status to FAILED with error message
      await this.reportsService.updateReportStatus(
        payload.reportId,
        reportStatus.FAILED,
        undefined,
        error.message,
      );

      // Send failure notification
      const reportTypeName = this.getReportTypeName(payload.type);
      await this.notificationService.create({
        text: `Falha ao gerar relatório de ${reportTypeName}: ${error.message}`,
        type: 'REPORT_FAILED',
        to: payload.userId,
      });
    }
  }

  private getReportTypeName(type: string): string {
    const typeNames = {
      PRODUCTS: 'produtos',
      ORDERS: 'pedidos',
      MOVEMENTS: 'movimentações',
      STOCK: 'estoque',
      USERS: 'usuários',
    };
    return typeNames[type] || 'relatório';
  }
}
