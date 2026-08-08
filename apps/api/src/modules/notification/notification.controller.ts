import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { GetUserId } from "src/shared/decorators/get-user-id";
// biome-ignore lint/style/useImportType: <explanation>
import { NotificationService } from "./notification.service";

@Controller("notification")
@UseGuards(AuthGuard("jwt"))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(@GetUserId() userId: string) {
    return this.notificationService.findAll(userId);
  }

  @Get("/all")
  findAllPaginated(
    @GetUserId() userId: string,
    @Query()
    query: { page?: string | number; pageSize?: string | number },
  ) {
    const page = query.page ? Number.parseInt(query.page as string) : 1;
    const pageSize = query.pageSize
      ? Number.parseInt(query.pageSize as string)
      : 20;
    return this.notificationService.findAllPaginated(userId, page, pageSize);
  }

  @Post("/read/:id")
  read(@Param("id") id: string, @GetUserId() userId: string) {
    return this.notificationService.read(id, userId);
  }

  @Patch("/read-all")
  readAll(@GetUserId() userId: string) {
    return this.notificationService.readAll(userId);
  }
}
