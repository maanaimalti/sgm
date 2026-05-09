import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";

@Injectable()
export class DepartmentService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll() {
    return this.prismaService.department.findMany();
  }

  findOne(id: string) {
    return this.prismaService.department.findUnique({ where: { id } });
  }
}
