import { Injectable } from '@nestjs/common';
import type { PrismaService } from 'src/shared/db/prisma.service';
import type { HelpersService } from 'src/shared/helpers/helpers.service';
import type { CreateUnityDto } from './dto/create-unity.dto';
import type { UpdateUnityDto } from './dto/update-unity.dto';

@Injectable()
export class UnityService {
  constructor(
    private readonly helpersService: HelpersService,
    private readonly prismaService: PrismaService,
  ) {}

  create(createUnityDto: CreateUnityDto) {
    const { name, description } = createUnityDto;
    const id = this.helpersService.generateId();
    return this.prismaService.unity.create({
      data: {
        id,
        name,
        description,
      },
    });
  }

  findAll() {
    return this.prismaService.unity.findMany();
  }

  findOne(id: string) {
    return this.prismaService.unity.findUnique({
      where: {
        id,
      },
    });
  }

  async update(id: string, updateUnityDto: UpdateUnityDto) {
    await this.prismaService.unity.update({
      where: {
        id,
      },
      data: {
        description: updateUnityDto.description,
        name: updateUnityDto.name,
      },
    });
  }

  async remove(id: string) {
    await this.prismaService.unity.delete({
      where: {
        id,
      },
    });
  }
}
