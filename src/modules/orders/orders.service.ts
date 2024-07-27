import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { orderStatus } from '@prisma/client';
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from 'src/shared/db/prisma.service';
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from 'src/shared/helpers/helpers.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { FindAllOrdersDto } from './dto/find-all-orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly helpersService: HelpersService,
    private readonly prismaService: PrismaService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items, userId } = createOrderDto;
    const id = this.helpersService.generateId();
    Logger.log(`Creating order with id: ${id} and user id: ${userId}`);
    const result = await this.prismaService.orders.create({
      data: {
        id,
        user: {
          connect: {
            id: userId,
          },
        },
        orderItem: {
          create: items.map((item) => ({
            id: this.helpersService.generateId(),
            product: {
              connect: {
                id: item.productId,
              },
            },
            quantity: item.quantity,
          })),
        },
      },
    });
    return result;
  }

  findAll(findAllOrdersDto: FindAllOrdersDto) {
    const { page = 1, pageSize = 10 } = findAllOrdersDto;
    return this.prismaService.orders.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const data = await this.prismaService.orders.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        createdAt: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    Logger.log(`Order with id: ${id} found. Request by: ${id}`);
    if (!data) {
      Logger.error(`Order with id: ${id} not found. Request by: ${id}`);
      throw new NotFoundException(`Order with id: ${id} not found`);
    }
    return data;
  }

  async approveOrder(id: string) {
    await this.prismaService.orders.update({
      where: {
        id,
      },
      data: {
        status: orderStatus.APPROVED,
      },
    });
  }

  async cancelOrder(id: string) {
    await this.prismaService.orders.update({
      where: {
        id,
      },
      data: {
        status: orderStatus.CANCELED,
      },
    });
  }
}
