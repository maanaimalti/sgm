import { Controller, Get, Param, Post } from '@nestjs/common';
import { GetUserId } from 'src/shared/decorators/get-user-id';
// biome-ignore lint/style/useImportType: <explanation>
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(@GetUserId() userId: string) {
    return this.notificationService.findAll(userId);
  }

  @Post('/read/:id')
  read(@Param('id') id: string) {
    return this.notificationService.read(id);
  }
}
