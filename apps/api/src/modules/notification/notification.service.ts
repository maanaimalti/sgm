import { Injectable } from "@nestjs/common";

// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";

// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";

@Injectable()
export class NotificationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly helpersService: HelpersService,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const { to, type, text, metadata } = createNotificationDto;
    const id = this.helpersService.generateId();
    await this.prismaService.notification.create({
      data: {
        id,
        text,
        type,
        metadata,
        user: {
          connect: {
            id: to,
          },
        },
      },
    });
  }

  findAll(userId: string) {
    return this.prismaService.notification.findMany({
      where: {
        user: {
          id: userId,
        },
        readableAt: null,
      },
      take: 5,
    });
  }

  async read(id: string) {
    await this.prismaService.notification.update({
      where: {
        id,
      },
      data: {
        readableAt: new Date(),
      },
    });
  }
}
