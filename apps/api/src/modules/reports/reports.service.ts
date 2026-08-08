import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { reportStatus, type reportType } from "@prisma/client";
import { PrismaService } from "src/shared/db/prisma.service";
import { HelpersService } from "src/shared/helpers/helpers.service";
// biome-ignore lint/style/useImportType: Nest DI requires the runtime class.
import { UploadFileService } from "src/shared/upload/upload-file.service";
import { CreateReportDto } from "./dto/create-report.dto";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly helpersService: HelpersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly uploadFileService: UploadFileService,
  ) {}

  async createReport(userId: string, createReportDto: CreateReportDto) {
    const reportId = this.helpersService.generateId();
    const fileName = `${createReportDto.type.toLowerCase()}_report_${Date.now()}.pdf`;

    this.logger.log(
      `Creating ${createReportDto.type} report for user ${userId}`,
    );

    await this.prismaService.report.create({
      data: {
        id: reportId,
        type: createReportDto.type as reportType,
        userId,
        departmentId: createReportDto.departmentId,
        fileName,
        status: reportStatus.PENDING,
        parameters: createReportDto.parameters,
      },
    });

    // Emit event for async processing
    this.eventEmitter.emit("report.generate", {
      reportId,
      type: createReportDto.type,
      userId,
      departmentId: createReportDto.departmentId,
      parameters: createReportDto.parameters
        ? JSON.parse(createReportDto.parameters)
        : {},
    });

    return {
      reportId,
      status: "PENDING",
      message:
        "Geração do relatório iniciada. Você será notificado quando estiver pronto.",
    };
  }

  async getReports(userId: string, page = 1, pageSize = 10) {
    const reports = await this.prismaService.report.findMany({
      where: { userId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        fileName: true,
        filePath: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const total = await this.prismaService.report.count({
      where: { userId },
    });

    return {
      reports: await Promise.all(reports.map((r) => this.withDownloadUrl(r))),
      total,
    };
  }

  async getReport(reportId: string, userId: string) {
    const report = await this.prismaService.report.findFirst({
      where: { id: reportId, userId },
    });
    if (!report) return null;
    return this.withDownloadUrl(report);
  }

  /** `filePath` holds the storage key; the signed URL is minted per request. */
  private async withDownloadUrl<T extends { filePath: string | null }>(
    report: T,
  ): Promise<T & { downloadUrl: string | null }> {
    return {
      ...report,
      downloadUrl: report.filePath
        ? await this.uploadFileService.getDownloadUrl(report.filePath)
        : null,
    };
  }

  async updateReportStatus(
    reportId: string,
    status: reportStatus,
    filePath?: string,
    errorMessage?: string,
  ) {
    return this.prismaService.report.update({
      where: { id: reportId },
      data: {
        status,
        filePath,
        errorMessage,
        updatedAt: new Date(),
      },
    });
  }
}
