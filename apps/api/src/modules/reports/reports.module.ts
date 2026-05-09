import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { DBModule } from "src/shared/db/db.module";
import { HelpersModule } from "src/shared/helpers/helpers.module";
import { UploadFileModule } from "src/shared/upload/upload-file.module";
import { NotificationModule } from "../notification/notification.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ProductReportService } from "./services/product-report.service";
import { ReportGeneratorService } from "./services/report-generator.service";

@Module({
  imports: [
    DBModule,
    HelpersModule,
    UploadFileModule,
    NotificationModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportGeneratorService, ProductReportService],
  exports: [ReportsService],
})
export class ReportsModule {}
