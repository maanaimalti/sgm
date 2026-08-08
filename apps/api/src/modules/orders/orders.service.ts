import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest DI requires the runtime class.
import { EventEmitter2 } from "@nestjs/event-emitter";
import { orderStatus, reportStatus, reportType } from "@prisma/client";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
// biome-ignore lint/style/useImportType: <explanation>
import { UploadFileService } from "src/shared/upload/upload-file.service";
// biome-ignore lint/style/useImportType: <explanation>
import { NotificationService } from "../notification/notification.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { FindAllOrdersDto } from "./dto/find-all-orders.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { computeOrderSignature } from "./order-signature";

const APPROVER_ROLES = ["admin", "manager"];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly helpersService: HelpersService,
    private readonly prismaService: PrismaService,
    private readonly uploadFileService: UploadFileService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items, userId, observation, event } = createOrderDto;
    const id = this.helpersService.generateId();
    this.logger.log(`Creating order ${id} for user ${userId}`);

    const created = await this.prismaService.$transaction(async (tx) => {
      const next = await tx.order_counter.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
        select: { value: true },
      });
      const friendlyCode = `#${String(next.value).padStart(4, "0")}`;

      const order = await tx.orders.create({
        data: {
          id,
          friendlyCode,
          user: { connect: { id: userId } },
          orderItem: {
            create: items.map((item) => ({
              id: this.helpersService.generateId(),
              product: { connect: { id: item.productId } },
              quantity: item.quantity,
            })),
          },
          observation,
          event,
        },
      });

      await tx.orderEvent.create({
        data: {
          id: this.helpersService.generateId(),
          orderId: order.id,
          type: "CREATED",
          userId,
          payload: { itemCount: items.length, event: event ?? null },
        },
      });

      return order;
    });

    await this.notifyPendingOrder(created.id, created.friendlyCode);
    return created;
  }

  private async notifyPendingOrder(
    orderId: string,
    friendlyCode: string | null,
  ) {
    try {
      const recipients = await this.prismaService.user.findMany({
        where: {
          roles: { some: { name: { in: APPROVER_ROLES } } },
        },
        select: { id: true },
      });
      const code = friendlyCode ?? `#${orderId.slice(0, 6)}`;
      await Promise.all(
        recipients.map((r) =>
          this.notificationService.create({
            to: r.id,
            type: "PENDING_ORDER",
            text: `Pedido ${code} aguarda aprovação.`,
            metadata: JSON.stringify({ orderId }),
          }),
        ),
      );
    } catch (error) {
      this.logger.error("Failed to fan out PENDING_ORDER notifications", error);
    }
  }

  private async notifyResubmittedOrder(
    orderId: string,
    friendlyCode: string | null,
  ) {
    try {
      const recipients = await this.prismaService.user.findMany({
        where: {
          roles: { some: { name: { in: APPROVER_ROLES } } },
        },
        select: { id: true },
      });
      const code = friendlyCode ?? `#${orderId.slice(0, 6)}`;
      await Promise.all(
        recipients.map((r) =>
          this.notificationService.create({
            to: r.id,
            type: "ORDER_RESUBMITTED",
            text: `Pedido ${code} foi reenviado após rejeição.`,
            metadata: JSON.stringify({ orderId }),
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        "Failed to fan out ORDER_RESUBMITTED notifications",
        error,
      );
    }
  }

  async findAll(findAllOrdersDto: FindAllOrdersDto) {
    const { page = 1, pageSize = 10, status, search } = findAllOrdersDto;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { event: { contains: search, mode: "insensitive" } },
        { friendlyCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prismaService.orders.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          friendlyCode: true,
          event: true,
          user: { select: { id: true, name: true } },
          status: true,
          createdAt: true,
          _count: { select: { orderItem: true } },
        },
      }),
      this.prismaService.orders.count({ where }),
    ]);

    return {
      orders: orders.map((o) => ({
        id: o.id,
        friendlyCode: o.friendlyCode,
        event: o.event,
        status: o.status,
        createdAt: o.createdAt,
        user: o.user,
        itemCount: o._count.orderItem,
      })),
      total,
    };
  }

  async findOne(id: string) {
    const data = await this.prismaService.orders.findUnique({
      where: { id },
      select: {
        id: true,
        friendlyCode: true,
        user: { select: { id: true, name: true } },
        status: true,
        statusObservation: true,
        approvedAt: true,
        approvedBy: { select: { id: true, name: true } },
        rejectedAt: true,
        rejectedBy: { select: { id: true, name: true } },
        createdAt: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                costValue: true,
                category: { select: { id: true, name: true } },
                unity: { select: { name: true } },
              },
            },
          },
        },
        observation: true,
        event: true,
        events: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            type: true,
            createdAt: true,
            payload: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!data) {
      throw new NotFoundException(`Order with id: ${id} not found`);
    }
    // Decimal keeps the money exact in Postgres, but serializes to a JSON
    // string. The wire contract is a number, so unwrap it here.
    return {
      ...data,
      orderItem: data.orderItem.map((item) => ({
        ...item,
        product: {
          ...item.product,
          costValue: item.product.costValue.toNumber(),
        },
      })),
    };
  }

  async approveOrder(id: string, userId: string) {
    const order = await this.prismaService.orders.findUnique({
      where: { id },
      select: { id: true, userId: true, friendlyCode: true, status: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with id: ${id} not found`);
    }
    if (order.status !== orderStatus.PENDING) {
      throw new ConflictException(
        `Order ${id} cannot be approved from status ${order.status}`,
      );
    }

    await this.prismaService.$transaction([
      this.prismaService.orders.update({
        where: { id },
        data: {
          status: orderStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
        },
      }),
      this.prismaService.orderEvent.create({
        data: {
          id: this.helpersService.generateId(),
          orderId: id,
          type: "APPROVED",
          userId,
          payload: {},
        },
      }),
    ]);

    const code = order.friendlyCode ?? `#${order.id.slice(0, 6)}`;
    await this.notificationService.create({
      to: order.userId,
      type: "ORDER_APPROVED",
      text: `Pedido ${code} foi aprovado.`,
      metadata: JSON.stringify({ orderId: id }),
    });
  }

  async rejectOrder(id: string, userId: string, observation: string) {
    const order = await this.prismaService.orders.findUnique({
      where: { id },
      select: { id: true, userId: true, friendlyCode: true, status: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with id: ${id} not found`);
    }
    if (order.status !== orderStatus.PENDING) {
      throw new ConflictException(
        `Order ${id} cannot be rejected from status ${order.status}`,
      );
    }

    this.logger.log(
      `Rejecting order ${id} by user ${userId} (code ${order.friendlyCode})`,
    );

    await this.prismaService.$transaction([
      this.prismaService.orders.update({
        where: { id },
        data: {
          status: orderStatus.REJECTED,
          statusObservation: observation,
          rejectedById: userId,
          rejectedAt: new Date(),
        },
      }),
      this.prismaService.orderEvent.create({
        data: {
          id: this.helpersService.generateId(),
          orderId: id,
          type: "REJECTED",
          userId,
          payload: { reason: observation },
        },
      }),
    ]);

    const code = order.friendlyCode ?? `#${order.id.slice(0, 6)}`;
    await this.notificationService.create({
      to: order.userId,
      type: "ORDER_REJECTED",
      text: `Pedido ${code} foi rejeitado.`,
      metadata: JSON.stringify({ orderId: id, reason: observation }),
    });
  }

  async cancelOrder(
    id: string,
    userId: string,
    callerRoles: string[],
    observation?: string,
  ) {
    const order = await this.prismaService.orders.findUnique({
      where: { id },
      select: { id: true, userId: true, friendlyCode: true, status: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with id: ${id} not found`);
    }

    const isApprover = callerRoles.some((r) => APPROVER_ROLES.includes(r));
    const isCreator = order.userId === userId;
    if (!isApprover && !isCreator) {
      throw new ForbiddenException(
        "Only the creator or an approver can cancel this order",
      );
    }

    const cancelable: orderStatus[] = [
      orderStatus.PENDING,
      orderStatus.REJECTED,
      orderStatus.APPROVED,
    ];
    if (!cancelable.includes(order.status)) {
      throw new ConflictException(
        `Order ${id} cannot be canceled from status ${order.status}`,
      );
    }

    await this.prismaService.$transaction([
      this.prismaService.orders.update({
        where: { id },
        data: {
          status: orderStatus.CANCELED,
          statusObservation: observation,
        },
      }),
      this.prismaService.orderEvent.create({
        data: {
          id: this.helpersService.generateId(),
          orderId: id,
          type: "CANCELED",
          userId,
          payload: { reason: observation ?? null },
        },
      }),
    ]);

    if (!isCreator) {
      const code = order.friendlyCode ?? `#${order.id.slice(0, 6)}`;
      await this.notificationService.create({
        to: order.userId,
        type: "ORDER_CANCELED",
        text: `Pedido ${code} foi cancelado.`,
        metadata: JSON.stringify({ orderId: id, reason: observation ?? null }),
      });
    }
  }

  async updateOrder(id: string, userId: string, dto: UpdateOrderDto) {
    const order = await this.prismaService.orders.findUnique({
      where: { id },
      select: { id: true, userId: true, friendlyCode: true, status: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with id: ${id} not found`);
    }
    if (order.userId !== userId) {
      throw new ForbiddenException("Only the creator can resubmit this order");
    }
    if (order.status !== orderStatus.REJECTED) {
      throw new ConflictException(
        `Order ${id} can only be resubmitted from REJECTED status`,
      );
    }

    const changedFields: string[] = [];
    if (dto.event !== undefined) changedFields.push("event");
    if (dto.observation !== undefined) changedFields.push("observation");
    if (dto.items !== undefined) changedFields.push("items");

    this.logger.log(
      `Resubmitting order ${id} by ${userId}; changed fields: ${changedFields.join(",") || "none"}`,
    );

    await this.prismaService.$transaction(async (tx) => {
      if (dto.items !== undefined) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderItem.createMany({
          data: dto.items.map((it) => ({
            id: this.helpersService.generateId(),
            orderId: id,
            productId: it.productId,
            quantity: it.quantity,
          })),
        });
      }

      await tx.orders.update({
        where: { id },
        data: {
          event: dto.event,
          observation: dto.observation,
          status: orderStatus.PENDING,
          statusObservation: null,
        },
      });

      await tx.orderEvent.create({
        data: {
          id: this.helpersService.generateId(),
          orderId: id,
          type: "RESUBMITTED",
          userId,
          payload: { changedFields },
        },
      });
    });

    await this.invalidateReport(id);
    await this.notifyResubmittedOrder(id, order.friendlyCode);
  }

  private async invalidateReport(orderId: string) {
    const existing = await this.prismaService.orderReports.findFirst({
      where: { orderId },
      select: { id: true, url: true },
    });
    if (!existing) return;

    try {
      await this.uploadFileService.deleteFile("sgm", existing.url);
    } catch (error) {
      this.logger.warn(
        `Failed to delete R2 object ${existing.url}; dropping DB row anyway`,
        error,
      );
    }
    await this.prismaService.orderReports.delete({
      where: { id: existing.id },
    });
  }

  /**
   * Loads the order fields that feed the report signature plus its owner, so
   * the report endpoints can both authorize the caller and decide whether a
   * cached PDF still matches the order's current content.
   */
  private async loadOrderForSignature(id: string) {
    const order = await this.prismaService.orders.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        event: true,
        observation: true,
        approvedById: true,
        orderItem: { select: { productId: true, quantity: true } },
      },
    });
    if (!order) {
      throw new NotFoundException(`Order with id: ${id} not found`);
    }
    return { order, signature: computeOrderSignature(order) };
  }

  private async findPendingReport(orderId: string) {
    return this.prismaService.report.findFirst({
      where: {
        type: reportType.ORDERS,
        status: { in: [reportStatus.PENDING, reportStatus.PROCESSING] },
        parameters: { contains: orderId },
      },
      select: { id: true },
    });
  }

  async getReport(id: string, userId: string, callerRoles: string[]) {
    const { order, signature } = await this.loadOrderForSignature(id);
    this.assertCanAccessReport(order.userId, userId, callerRoles);

    const existing = await this.prismaService.orderReports.findFirst({
      where: { orderId: id },
      select: { url: true, signature: true },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return {
        status: "ready" as const,
        url: this.uploadFileService.getFileUrl(existing.url),
        stale: existing.signature !== signature,
      };
    }

    if (await this.findPendingReport(id)) {
      return { status: "processing" as const };
    }

    return { status: "none" as const };
  }

  async generateReport(orderId: string, userId: string, callerRoles: string[]) {
    const { order, signature } = await this.loadOrderForSignature(orderId);
    this.assertCanAccessReport(order.userId, userId, callerRoles);

    // Serve the cached PDF only when it still matches the order's content.
    const existing = await this.prismaService.orderReports.findFirst({
      where: { orderId },
      select: { url: true, signature: true },
      orderBy: { createdAt: "desc" },
    });
    if (existing && existing.signature === signature) {
      return {
        status: "ready" as const,
        url: this.uploadFileService.getFileUrl(existing.url),
        stale: false,
      };
    }

    // A job is already in flight — don't enqueue a duplicate.
    if (await this.findPendingReport(orderId)) {
      return { status: "processing" as const };
    }

    const reportId = this.helpersService.generateId();
    const parameters = JSON.stringify({ orderId });
    await this.prismaService.report.create({
      data: {
        id: reportId,
        type: reportType.ORDERS,
        userId,
        fileName: `relatorio-pedido-${orderId.toLowerCase()}.pdf`,
        status: reportStatus.PENDING,
        parameters,
      },
    });

    this.eventEmitter.emit("report.generate", {
      reportId,
      type: "ORDERS",
      userId,
      parameters: { orderId },
    });

    return { status: "processing" as const };
  }

  private assertCanAccessReport(
    ownerId: string,
    callerId: string,
    callerRoles: string[],
  ) {
    const isApproverOrBuyer = callerRoles.some((r) =>
      [...APPROVER_ROLES, "buyer"].includes(r),
    );
    const isCreator = ownerId === callerId;
    if (!isApproverOrBuyer && !isCreator) {
      throw new ForbiddenException(
        "You can only access reports for your own orders",
      );
    }
  }
}
