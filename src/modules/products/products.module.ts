import { Module } from '@nestjs/common';
import { DBModule } from 'src/shared/db/db.module';
import { HelpersModule } from 'src/shared/helpers/helpers.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [DBModule, HelpersModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
