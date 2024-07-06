import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma.service';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(product: Prisma.productCreateArgs) {
    await this.prisma.product.create(product);
  }

  async findAll(params: Prisma.productFindManyArgs) {
    return this.prisma.product.findMany(params);
  }

  async findOne(params: Prisma.productFindUniqueArgs) {
    return this.prisma.product.findUnique(params);
  }

  async update(params: Prisma.productUpdateArgs) {
    return this.prisma.product.update(params);
  }

  async remove(params: Prisma.productDeleteArgs) {
    return this.prisma.product.delete(params);
  }

  async count(params: Prisma.productCountArgs) {
    return this.prisma.product.count(params);
  }

  async findFirst(params: Prisma.productFindFirstArgs) {
    return this.prisma.product.findFirst(params);
  }
}
