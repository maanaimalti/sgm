import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './modules/category/category.module';
import { MovementModule } from './modules/movement/movement.module';
import { ProductsModule } from './modules/products/products.module';
import { UnityModule } from './modules/unity/unity.module';
import { AuthModule } from './shared/auth/auth.module';
import { HelpersModule } from './shared/helpers/helpers.module';

@Module({
  imports: [
    ProductsModule,
    HelpersModule,
    MovementModule,
    CategoryModule,
    UnityModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
