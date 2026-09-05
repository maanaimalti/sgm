import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
// biome-ignore lint/style/useImportType: Nest DI requires the runtime class.
import { SupabaseAdminService } from "src/shared/supabase/supabase-admin.service";
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
    private readonly supabase: SupabaseAdminService,
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
    // Roles and department assignments live on the auth account now, so "who
    // holds this role" is no longer a join — see SupabaseAdminService.
    const recipients = await this.supabase.findUserIdsByRole(
      toRoles,
      departmentId,
    );
    await Promise.all(
      recipients.map((to) => this.create({ to, type, text, metadata })),
    );
  }

  findAll(userId: string) {
    assertUserId(userId);
    return this.prismaService.notification.findMany({
      where: {
        to: userId,
        readableAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  }

  async findAllPaginated(userId: string, page = 1, pageSize = 20) {
    assertUserId(userId);
    const where = { to: userId };
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

  async read(id: string, userId: string) {
    assertUserId(userId);
    const result = await this.prismaService.notification.updateMany({
      where: { id, to: userId },
      data: { readableAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Notification with id: ${id} not found`);
    }
  }

  async readAll(userId: string) {
    assertUserId(userId);
    const result = await this.prismaService.notification.updateMany({
      where: { to: userId, readableAt: null },
      data: { readableAt: new Date() },
    });
    return { updated: result.count };
  }
}

/**
 * Prisma drops `undefined` filter values instead of failing, so a missing user
 * id would silently widen these queries to every user's notifications. Every
 * caller is behind a JWT guard; this is the second line of defence.
 */
function assertUserId(userId: string): asserts userId is string {
  if (!userId) {
    throw new UnauthorizedException();
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
