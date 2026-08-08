import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "src/shared/auth/roles.decorator";
import { RolesGuard } from "src/shared/auth/roles.guard";
import { GetDepartmentId } from "src/shared/decorators/get-department-id";
import { CreateMovementDto } from "./dto/create-movement.dto";
import { CreateMovementBatchDto } from "./dto/create-movement-batch.dto";
// biome-ignore lint/style/useImportType: <explanation>
import { MovementService } from "./movement.service";

@Controller("movement")
export class MovementController {
  constructor(private readonly movementService: MovementService) {}

  @Post()
  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  create(@Body() createMovementDto: CreateMovementDto) {
    return this.movementService.create(createMovementDto);
  }

  @Post("/batch")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  createBatch(@Body() createMovementDto: CreateMovementBatchDto) {
    return this.movementService.createBatch(createMovementDto);
  }

  @Get("/stock")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  findAllStock(
    @Query()
    {
      page,
      pageSize,
      search,
    }: { page?: string | number; pageSize?: string | number; search?: string },
    @GetDepartmentId() departmentId: string,
  ) {
    page = page ? Number.parseInt(page as string) : 1;
    pageSize = pageSize ? Number.parseInt(pageSize as string) : 10;
    search = search || undefined;
    return this.movementService.findAllStock({
      page,
      pageSize,
      search,
      departmentId,
    });
  }

  @Get()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  findAll(
    @Query()
    {
      page,
      pageSize,
      search,
    }: { page?: string | number; pageSize?: string | number; search?: string },
    @GetDepartmentId() departmentId: string,
  ) {
    page = page ? Number.parseInt(page as string) : 1;
    pageSize = pageSize ? Number.parseInt(pageSize as string) : 10;
    search = search || undefined;
    return this.movementService.findAll({
      page,
      pageSize,
      search,
      departmentId,
    });
  }

  @Get(":id")
  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  findOne(@Param("id") id: string) {
    return this.movementService.findOne(id);
  }

  @Delete(":id")
  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  remove(@Param("id") id: string) {
    return this.movementService.remove(id);
  }
}
