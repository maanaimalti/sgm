import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { FindAllProductDto } from "./dto/find-all-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(
    private readonly helpersService: HelpersService,
    private readonly prismaService: PrismaService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    allowedDepartmentIds: string[],
  ) {
    assertDepartmentAllowed(
      createProductDto.departmentId,
      allowedDepartmentIds,
    );
    const id = this.helpersService.generateId();
    const product = { id, ...createProductDto };
    Logger.log(`Creating product with id: ${id} and name: ${product.name}`, {
      product,
    });
    await this.prismaService.product.create({
      data: {
        id: product.id,
        name: product.name,
        brand: product.brandName,
        unity: {
          connect: {
            id: product.unityId,
          },
        },
        category: {
          connect: {
            id: product.categoryId,
          },
        },
        description: product.description,
        costValue: product.costValue,
        saleValue: product.saleValue,
        minStock: product.minStock ?? 0,
        department: {
          connect: {
            id: product.departmentId,
          },
        },
      },
    });
    return product;
  }

  async findAll(findAllProductDto: FindAllProductDto) {
    const { page = 1, pageSize = 10, search, departmentId } = findAllProductDto;
    Logger.log(
      `Request all products with page: ${page} and page-size: ${pageSize}`,
    );
    let where: any = {
      status: "active",
      department: {
        id: departmentId,
      },
    };
    if (search) {
      Logger.log(`Request all products search: ${search}`);
      where = {
        ...where,
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      };
    }
    const products = await this.prismaService.product.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      orderBy: {
        name: "asc",
      },
      select: {
        category: {
          select: {
            name: true,
            id: true,
          },
        },
        unity: {
          select: {
            name: true,
            id: true,
          },
        },
        description: true,
        id: true,
        name: true,
        status: true,
        brand: true,
        minStock: true,
      },
    });
    const total = await this.prismaService.product.count({
      where: { status: "active" },
    });
    return {
      products,
      total,
    };
  }

  async findOne(id: string, departmentId: string) {
    const result = await this.prismaService.product.findUnique({
      where: {
        id,
        department: {
          id: departmentId,
        },
      },
      select: {
        category: {
          select: {
            name: true,
            id: true,
          },
        },
        unity: {
          select: {
            name: true,
            id: true,
          },
        },
        description: true,
        id: true,
        name: true,
        status: true,
        brand: true,
        costValue: true,
        saleValue: true,
        minStock: true,
        department: true,
      },
    });
    if (!result) return result;
    // Decimal keeps the money exact in Postgres, but serializes to a JSON
    // string. The wire contract is a number, so unwrap it here.
    return {
      ...result,
      costValue: result.costValue.toNumber(),
      saleValue: result.saleValue === null ? null : result.saleValue.toNumber(),
    };
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    allowedDepartmentIds: string[],
  ) {
    if (updateProductDto.departmentId) {
      assertDepartmentAllowed(
        updateProductDto.departmentId,
        allowedDepartmentIds,
      );
    }
    // Scope the row lookup by the caller's own departments, never by the
    // department in the payload — otherwise the caller picks the key that is
    // supposed to protect the record.
    const result = await this.prismaService.product.updateMany({
      where: {
        id,
        departmentId: { in: allowedDepartmentIds },
      },
      data: {
        categoryId: updateProductDto.categoryId,
        brand: updateProductDto.brandName,
        description: updateProductDto.description,
        unityId: updateProductDto.unityId,
        departmentId: updateProductDto.departmentId,
        costValue: updateProductDto.costValue,
        saleValue: updateProductDto.saleValue,
        minStock: updateProductDto.minStock,
        name: updateProductDto.name,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Product with id: ${id} not found`);
    }
  }

  async remove(id: string, allowedDepartmentIds: string[]) {
    const result = await this.prismaService.product.deleteMany({
      where: {
        id,
        departmentId: { in: allowedDepartmentIds },
      },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Product with id: ${id} not found`);
    }
  }
}

function assertDepartmentAllowed(
  departmentId: string,
  allowedDepartmentIds: string[],
) {
  if (!allowedDepartmentIds.includes(departmentId)) {
    throw new ForbiddenException("You do not have access to this department");
  }
}
