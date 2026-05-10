import { Injectable, Logger } from "@nestjs/common";
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

  async create(createProductDto: CreateProductDto) {
    const id = this.helpersService.generateId();
    const product = { id, ...createProductDto };
    Logger.log(`Creating product with id: ${id} and name: ${product.name}`, {
      product,
    });
    await this.prismaService.product.create({
      data: {
        id: product.id,
        name: product.name,
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
            },
          },
          {
            description: {
              contains: search,
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
        costValue: true,
        saleValue: true,
        minStock: true,
        department: true,
      },
    });
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.prismaService.product.update({
      where: {
        id,
        department: {
          id: updateProductDto.departmentId,
        },
      },
      data: {
        categoryId: updateProductDto.categoryId,
        description: updateProductDto.description,
        unityId: updateProductDto.unityId,
        departmentId: updateProductDto.departmentId,
        costValue: updateProductDto.costValue,
        saleValue: updateProductDto.saleValue,
        minStock: updateProductDto.minStock,
        name: updateProductDto.name,
      },
    });
  }

  async remove(id: string) {
    await this.prismaService.product.delete({
      where: {
        id,
      },
    });
  }
}
