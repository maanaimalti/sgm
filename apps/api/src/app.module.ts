import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
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
import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./shared/auth/auth.module";
import { validate } from "./shared/config/env.validation";
import { HelpersModule } from "./shared/helpers/helpers.module";
import { SupabaseModule } from "./shared/supabase/supabase.module";

@Module({
  imports: [
    ProductsModule,
    HelpersModule,
    MovementModule,
    CategoryModule,
    UnityModule,
    AuthModule,
    SupabaseModule,
    ConfigModule.forRoot({ isGlobal: true, validate }),
    // Provides the throttler storage. The guard is applied per-controller
    // (see AuthController), not globally.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    OrdersModule,
    NotificationModule,
    DepartmentModule,
    ReportsModule,
    PushModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
