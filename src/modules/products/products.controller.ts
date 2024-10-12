import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/shared/auth/roles.decorator';
import { RolesGuard } from 'src/shared/auth/roles.guard';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
// biome-ignore lint/style/useImportType: <explanation>
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  findAll(
    @Query()
    {
      page,
      pageSize,
      search,
    }: { page?: string | number; pageSize?: string | number; search?: string },
    @Headers('departmentId') departmentId: string,
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

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  findOne(
    @Param('id') id: string,
    @Headers('departmentId') departmentId: string,
  ) {
    return this.productsService.findOne(id, departmentId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
