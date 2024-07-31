import { Module } from '@nestjs/common';
import { UploadFileModule } from 'src/shared/upload/upload-file.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [UploadFileModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
