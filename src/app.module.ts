import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './modules/products/products.module';
import { HelpersModule } from './shared/helpers/helpers.module';
import { MovementModule } from './modules/movement/movement.module';
import { CategoryModule } from './modules/category/category.module';
import { UnityModule } from './modules/unity/unity.module';

@Module({
  imports: [ProductsModule, HelpersModule, MovementModule, CategoryModule, UnityModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
