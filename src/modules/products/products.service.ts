import { Injectable } from '@nestjs/common';
import type { ProductRepository } from 'src/shared/db/repositories/product-repository';
import type { HelpersService } from 'src/shared/helpers/helpers.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { FindAllProductDto } from './dto/find-all-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly helpersService: HelpersService,
    private readonly productRepository: ProductRepository,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const id = this.helpersService.generateId();
    const product = { id, ...createProductDto };
    await this.productRepository.create({
      data: {
        id: product.id,
        name: product.name,
        brandName: product.brandName,
        unity: {
          connect: {
            id: product.unityId,
          },
        },
        category: {
          connect: {
            id: product.categoryId,
          },
        },
        quantity: 0,
        description: product.description,
      },
    });
    return product;
  }

  async findAll(findAllProductDto: FindAllProductDto) {
    const { page, pageSize } = findAllProductDto;
    const products = await this.productRepository.findAll({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where: {
        status: 'active',
      },
      select: {
        category: {
          select: {
            name: true,
            id: true,
          },
        },
        unity: {
          select: {
            name: true,
            id: true,
          },
        },
        brandName: true,
        description: true,
        id: true,
        name: true,
        quantity: true,
        status: true,
      },
    });
    const total = await this.productRepository.count({
      where: { status: 'active' },
    });
    return {
      products,
      total,
    };
  }

  async findOne(id: string) {
    const result = await this.productRepository.findOne({
      where: {
        id,
      },
      select: {
        category: {
          select: {
            name: true,
            id: true,
          },
        },
        unity: {
          select: {
            name: true,
            id: true,
          },
        },
        brandName: true,
        description: true,
        id: true,
        name: true,
        quantity: true,
        status: true,
      },
    });
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
