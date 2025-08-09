import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { HelpersService } from 'src/shared/helpers/helpers.service';
import { PrismaService } from 'src/shared/db/prisma.service';
import { CreateMovementDto } from '../movement/dto/create-movement.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly helpersService: HelpersService,
    private readonly prismaService: PrismaService,
  ) {}

  create(CreateCategoryDto: CreateCategoryDto) {
    const { name, description } = CreateCategoryDto;
    const id = this.helpersService.generateId();
    return this.prismaService.category.create({
      data: {
        id,
        name,
        description,
      },
    });
  }

  findAll() {
    return this.prismaService.category.findMany();
  }

  findOne(id: string) {
    return this.prismaService.category.findUnique({
      where: {
        id,
      },
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.prismaService.category.update({
      where: {
        id,
      },
      data: {
        description: updateCategoryDto.description,
        name: updateCategoryDto.name,
      },
    });
  }

  async remove(id: string) {
    await this.prismaService.category.delete({
      where: {
        id,
      },
    });
  }
}
