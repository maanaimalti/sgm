import { Injectable } from '@nestjs/common';
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from 'src/shared/db/prisma.service';
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from 'src/shared/helpers/helpers.service';
import type { CreateMovementDto } from './dto/create-movement.dto';
import type { FindAllMovementDTO } from './dto/find-all-movement.dto';
import type { UpdateMovementDto } from './dto/update-movement.dto';

@Injectable()
export class MovementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly helpersService: HelpersService,
  ) {}

  create(createMovementDto: CreateMovementDto) {
    const { productId, quantity, type } = createMovementDto;
    const id = this.helpersService.generateId();
    return this.prismaService.movement.create({
      data: {
        id,
        quantity,
        type,
        product: {
          connect: {
            id: productId,
          },
        },
      },
    });
  }

  findAll(findAllMovementDto: FindAllMovementDTO) {
    const { page = 1, pageSize = 10 } = findAllMovementDto;
    return this.prismaService.movement.findMany({
      include: {
        product: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
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

  async update(id: string, updateMovementDto: UpdateMovementDto) {
    await this.prismaService.movement.update({
      where: {
        id,
      },
      data: {
        type: updateMovementDto.type,
        quantity: updateMovementDto.quantity,
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
