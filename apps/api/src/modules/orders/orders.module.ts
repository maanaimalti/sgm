import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { UploadFileModule } from "src/shared/upload/upload-file.module";
import { NotificationModule } from "../notification/notification.module";
import { OrderPdfService } from "./order-pdf.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [UploadFileModule, NotificationModule, EventEmitterModule.forRoot()],
  controllers: [OrdersController],
  providers: [OrdersService, OrderPdfService],
  exports: [OrderPdfService],
})
export class OrdersModule {}
