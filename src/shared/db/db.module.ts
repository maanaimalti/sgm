import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ProductRepository } from './repositories/product-repository';

@Global()
@Module({
  providers: [PrismaService, ProductRepository],
})
export class DBModule {}
