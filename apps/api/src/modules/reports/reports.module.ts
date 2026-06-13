import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { DBModule } from "src/shared/db/db.module";
import { HelpersModule } from "src/shared/helpers/helpers.module";
import { UploadFileModule } from "src/shared/upload/upload-file.module";
import { NotificationModule } from "../notification/notification.module";
import { OrdersModule } from "../orders/orders.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { OrderReportService } from "./services/order-report.service";
import { ProductReportService } from "./services/product-report.service";
import { ReportGeneratorService } from "./services/report-generator.service";

@Module({
  imports: [
    DBModule,
    HelpersModule,
    UploadFileModule,
    NotificationModule,
    OrdersModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportGeneratorService,
    ProductReportService,
    OrderReportService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
