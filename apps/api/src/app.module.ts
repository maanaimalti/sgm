import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CategoryModule } from "./modules/category/category.module";
import { DepartmentModule } from "./modules/department/department.module";
import { MovementModule } from "./modules/movement/movement.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { ProductsModule } from "./modules/products/products.module";
import { PushModule } from "./modules/push/push.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { UnityModule } from "./modules/unity/unity.module";
import { AuthModule } from "./shared/auth/auth.module";
import { HelpersModule } from "./shared/helpers/helpers.module";

@Module({
  imports: [
    ProductsModule,
    HelpersModule,
    MovementModule,
    CategoryModule,
    UnityModule,
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    OrdersModule,
    NotificationModule,
    DepartmentModule,
    ReportsModule,
    PushModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
