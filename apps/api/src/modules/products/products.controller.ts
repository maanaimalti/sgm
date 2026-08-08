import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "src/shared/auth/roles.decorator";
import { RolesGuard } from "src/shared/auth/roles.guard";
import {
  GetDepartmentId,
  GetDepartmentIds,
} from "src/shared/decorators/get-department-id";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
// biome-ignore lint/style/useImportType: <explanation>
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  create(
    @Body() createProductDto: CreateProductDto,
    @GetDepartmentIds() allowedDepartmentIds: string[],
  ) {
    return this.productsService.create(createProductDto, allowedDepartmentIds);
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
    return this.productsService.findAll({
      page,
      pageSize,
      search,
      departmentId,
    });
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  findOne(@Param("id") id: string, @GetDepartmentId() departmentId: string) {
    return this.productsService.findOne(id, departmentId);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @GetDepartmentIds() allowedDepartmentIds: string[],
  ) {
    return this.productsService.update(
      id,
      updateProductDto,
      allowedDepartmentIds,
    );
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  remove(
    @Param("id") id: string,
    @GetDepartmentIds() allowedDepartmentIds: string[],
  ) {
    return this.productsService.remove(id, allowedDepartmentIds);
  }
}
