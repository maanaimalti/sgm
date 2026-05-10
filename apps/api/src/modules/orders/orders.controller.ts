import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { orderStatus } from "@prisma/client";
import { Roles } from "src/shared/auth/roles.decorator";
import { RolesGuard } from "src/shared/auth/roles.guard";
import { GetUserId } from "src/shared/decorators/get-user-id";
import { CreateOrderControllerDto } from "./dto/create-order-controller.dto";
// biome-ignore lint/style/useImportType: <explanation>
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  create(
    @Body() createOrderDto: CreateOrderControllerDto,
    @GetUserId() userId: string,
  ) {
    const data = { ...createOrderDto, userId };
    return this.ordersService.create(data);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen", "buyer", "manager")
  findAll(
    @Query()
    query: {
      page?: string | number;
      pageSize?: string | number;
      status?: orderStatus;
      search?: string;
    },
  ) {
    const page = query.page ? Number.parseInt(query.page as string) : 1;
    const pageSize = query.pageSize
      ? Number.parseInt(query.pageSize as string)
      : 10;
    return this.ordersService.findAll({
      page,
      pageSize,
      status: query.status,
      search: query.search,
    });
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen", "buyer", "manager")
  findOne(@Param("id") id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch("/approve/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "manager")
  approveOrder(@Param("id") id: string, @GetUserId() userId: string) {
    return this.ordersService.approveOrder(id, userId);
  }

  @Patch("/cancel/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "manager")
  cancelOrder(
    @Param("id") id: string,
    @GetUserId() userId: string,
    @Body() body?: { observation?: string },
  ) {
    return this.ordersService.cancelOrder(id, userId, body?.observation);
  }

  @Get("/report/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "buyer", "manager")
  getReport(@Param("id") id: string) {
    return this.ordersService.getReport(id);
  }

  @Post("/report")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "buyer", "manager")
  generateReport(
    @Body() data: { orderId: string },
    @GetUserId() userId: string,
  ) {
    return this.ordersService.generateReport(data.orderId, userId);
  }
}
