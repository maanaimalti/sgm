import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { type movement, movementType, type Prisma } from "@prisma/client";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
// biome-ignore lint/style/useImportType: <explanation>
import { NotificationService } from "../notification/notification.service";
import { CreateMovementDto } from "./dto/create-movement.dto";
import { CreateMovementBatchDto } from "./dto/create-movement-batch.dto";
import { FindAllMovementDTO } from "./dto/find-all-movement.dto";

interface StockEffect {
  productId: string;
  previousStock: number;
  newStock: number;
}

@Injectable()
export class MovementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly helpersService: HelpersService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createMovementDto: CreateMovementDto) {
    const { movement, effects } = await this.prismaService.$transaction(
      async (tx) => {
        const applied = await this.applyMovement(tx, createMovementDto);
        return { movement: applied.movement, effects: [applied.effect] };
      },
    );

    await this.notifyLowStock(effects);
    return movement;
  }

  async createBatch(createMovementDto: CreateMovementBatchDto) {
    const { items } = createMovementDto;

    // One transaction for the whole batch, applied sequentially: two lines for
    // the same product must not race each other, and a failure halfway through
    // must not leave part of the batch committed.
    const effects = await this.prismaService.$transaction(
      async (tx) => {
        const applied: StockEffect[] = [];
        for (const item of items) {
          applied.push((await this.applyMovement(tx, item)).effect);
        }
        return applied;
      },
      { timeout: 15_000 },
    );

    await this.notifyLowStock(effects);
    return { applied: effects.length };
  }

  /**
   * Records one movement and moves the stock balance atomically.
   *
   * Outbound movements use a conditional `updateMany` guarded by
   * `quantity >= requested`, so concurrent callers cannot both pass the check
   * and drive the balance negative — no read-modify-write, no row locking.
   */
  private async applyMovement(
    tx: Prisma.TransactionClient,
    { productId, quantity, type }: CreateMovementDto,
  ): Promise<{ movement: movement; effect: StockEffect }> {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than zero");
    }

    const created = await tx.movement.create({
      data: {
        id: this.helpersService.generateId(),
        quantity,
        type: type === "in" ? movementType.in : movementType.out,
        product: { connect: { id: productId } },
      },
    });

    if (type === "in") {
      const stock = await tx.stock.upsert({
        where: { productId },
        create: {
          id: this.helpersService.generateId(),
          productId,
          quantity,
        },
        update: { quantity: { increment: quantity } },
        select: { quantity: true },
      });
      return {
        movement: created,
        effect: {
          productId,
          previousStock: stock.quantity - quantity,
          newStock: stock.quantity,
        },
      };
    }

    const updated = await tx.stock.updateMany({
      where: { productId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
    if (updated.count === 0) {
      const current = await tx.stock.findUnique({
        where: { productId },
        select: { quantity: true },
      });
      throw new ConflictException(
        `Estoque insuficiente: disponível ${current?.quantity ?? 0}, solicitado ${quantity}`,
      );
    }

    const after = await tx.stock.findUniqueOrThrow({
      where: { productId },
      select: { quantity: true },
    });
    return {
      movement: created,
      effect: {
        productId,
        previousStock: after.quantity + quantity,
        newStock: after.quantity,
      },
    };
  }

  /** Runs after the transaction commits — notifications must never hold it open. */
  private async notifyLowStock(effects: StockEffect[]) {
    for (const effect of effects) {
      if (effect.newStock >= effect.previousStock) continue;
      await this.maybeNotifyLowStock(
        effect.productId,
        effect.previousStock,
        effect.newStock,
      );
    }
  }

  private async maybeNotifyLowStock(
    productId: string,
    previousStock: number,
    newStock: number,
  ) {
    try {
      const product = await this.prismaService.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          minStock: true,
          departmentId: true,
        },
      });
      if (!product?.minStock || product.minStock <= 0) return;
      if (previousStock < product.minStock) return;
      if (newStock >= product.minStock) return;

      await this.notificationService.broadcast({
        toRoles: ["kitchen", "admin"],
        departmentId: product.departmentId,
        type: "LOW_STOCK",
        text: `Estoque baixo de ${product.name}: ${newStock} / mín ${product.minStock}.`,
        metadata: JSON.stringify({ productId: product.id }),
      });
    } catch (error) {
      Logger.error("Failed to evaluate low-stock notification", { error });
    }
  }

  findAll(findAllMovementDto: FindAllMovementDTO) {
    const {
      page = 1,
      pageSize = 10,
      search,
      departmentId,
    } = findAllMovementDto;
    Logger.log(
      `Request all movements with page: ${page} and page-size: ${pageSize}`,
    );
    let where: any = {
      product: {
        product: {
          department: {
            id: departmentId,
          },
        },
      },
    };
    if (search) {
      Logger.log(`Request all movements search: ${search}`);
      where = {
        ...where,
        OR: [
          {
            name: {
              contains: search,
            },
          },
          {
            description: {
              contains: search,
            },
          },
        ],
      };
    }
    return this.prismaService.movement.findMany({
      select: {
        id: true,
        type: true,
        quantity: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findAllStock(findAllMovementDto: FindAllMovementDTO) {
    const {
      page = 1,
      pageSize = 10,
      search,
      departmentId,
    } = findAllMovementDto;
    Logger.log(
      `Request all stocks with page: ${page} and page-size: ${pageSize}`,
    );
    const where: Prisma.stockWhereInput = {
      product: { departmentId },
    };
    if (search) {
      Logger.log(`Request all stocks search: ${search}`);
      where.product = {
        departmentId,
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      };
    }
    return this.prismaService.stock.findMany({
      select: {
        id: true,
        quantity: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            name: true,
            minStock: true,
            department: {
              select: {
                name: true,
                id: true,
              },
            },
            unity: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findOne(id: string) {
    return this.prismaService.movement.findUnique({
      where: {
        id,
      },
      include: {
        product: true,
      },
    });
  }

  async remove(id: string) {
    await this.prismaService.movement.delete({
      where: {
        id,
      },
    });
  }
}
