import { Injectable, Logger } from "@nestjs/common";
import { movementType } from "@prisma/client";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
import { CreateMovementDto } from "./dto/create-movement.dto";
import { CreateMovementBatchDto } from "./dto/create-movement-batch.dto";
import { FindAllMovementDTO } from "./dto/find-all-movement.dto";

@Injectable()
export class MovementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly helpersService: HelpersService,
  ) {}

  async create(createMovementDto: CreateMovementDto) {
    const { productId, quantity, type } = createMovementDto;
    const id = this.helpersService.generateId();
    const result = await this.prismaService.movement.create({
      data: {
        id,
        quantity,
        type: type === "in" ? movementType.in : movementType.out,
        product: {
          connect: {
            id: productId,
          },
        },
      },
    });
    const stock = await this.prismaService.stock.findFirst({
      select: {
        id: true,
        quantity: true,
      },
      where: {
        product: {
          id: productId,
        },
      },
    });
    if (!stock) {
      await this.prismaService.stock.create({
        data: {
          id: this.helpersService.generateId(),
          quantity: quantity < 0 ? 0 : quantity,
          product: {
            connect: {
              id: productId,
            },
          },
        },
      });
      return result;
    }
    let newQuantity = stock.quantity ?? 0;
    if (type === "in") {
      newQuantity += quantity;
    }
    if (type === "out") {
      newQuantity =
        stock.quantity - quantity < 0 ? 0 : stock.quantity - quantity;
    }

    await this.prismaService.stock.update({
      where: {
        id: stock.id,
      },
      data: {
        quantity: newQuantity,
        updatedAt: new Date(),
      },
    });
    return result;
  }

  async createBatch(createMovementDto: CreateMovementBatchDto) {
    const { items } = createMovementDto;

    const promises = items.map((item) => this.create(item));

    await Promise.allSettled(promises);
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
    const { page = 1, pageSize = 10, search } = findAllMovementDto;
    Logger.log(
      `Request all stocks with page: ${page} and page-size: ${pageSize}`,
    );
    let where: any = {};
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
