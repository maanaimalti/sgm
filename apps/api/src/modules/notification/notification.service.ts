import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
// biome-ignore lint/style/useImportType: Nest DI requires the runtime class.
import { PushService } from "../push/push.service";
import {
  CreateNotificationDto,
  type NotificationType,
} from "./dto/create-notification.dto";

interface BroadcastInput {
  toRoles: string[];
  departmentId?: string | null;
  type: NotificationType;
  text: string;
  metadata?: string;
}

const PUSH_TITLE_BY_TYPE: Record<string, string> = {
  PENDING_ORDER: "Pedido aguardando aprovação",
  LOW_STOCK: "Estoque baixo",
  ORDER_APPROVED: "Pedido aprovado",
  ORDER_REJECTED: "Pedido rejeitado",
  ORDER_RESUBMITTED: "Pedido reenviado",
  ORDER_CANCELED: "Pedido cancelado",
  ORDER_REPORT: "Relatório do pedido",
  REPORT_READY: "Relatório pronto",
  REPORT_FAILED: "Falha ao gerar relatório",
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly helpersService: HelpersService,
    private readonly pushService: PushService,
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

    // Mirror the in-app notification to any registered push devices.
    void this.pushService
      .sendToUser(to, {
        title: PUSH_TITLE_BY_TYPE[type] ?? "Maanaim",
        body: text,
        type,
        url: deeplinkFor(metadata),
      })
      .catch(() => undefined);
  }

  async broadcast({
    toRoles,
    departmentId,
    type,
    text,
    metadata,
  }: BroadcastInput) {
    const recipients = await this.prismaService.user.findMany({
      where: {
        roles: { some: { name: { in: toRoles } } },
        ...(departmentId ? { department: { some: { id: departmentId } } } : {}),
      },
      select: { id: true },
    });
    await Promise.all(
      recipients.map((r) => this.create({ to: r.id, type, text, metadata })),
    );
  }

  findAll(userId: string) {
    return this.prismaService.notification.findMany({
      where: {
        user: { id: userId },
        readableAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  }

  async findAllPaginated(userId: string, page = 1, pageSize = 20) {
    const where = { user: { id: userId } };
    const [notifications, total, unreadCount] = await Promise.all([
      this.prismaService.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.notification.count({ where }),
      this.prismaService.notification.count({
        where: { ...where, readableAt: null },
      }),
    ]);
    return { notifications, total, unreadCount };
  }

  async read(id: string) {
    await this.prismaService.notification.update({
      where: { id },
      data: { readableAt: new Date() },
    });
  }

  async readAll(userId: string) {
    const result = await this.prismaService.notification.updateMany({
      where: { user: { id: userId }, readableAt: null },
      data: { readableAt: new Date() },
    });
    return { updated: result.count };
  }
}

/** Derives the in-app route a push notification should open from its metadata. */
function deeplinkFor(metadata?: string | null): string {
  if (!metadata) return "/notificacoes";
  try {
    const parsed = JSON.parse(metadata) as { orderId?: string };
    if (parsed.orderId) return `/pedidos/${parsed.orderId}`;
  } catch {
    // metadata is not JSON — fall back to the notification center
  }
  return "/notificacoes";
}
