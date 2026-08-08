import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    const users = await this.prismaService.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        roles: { select: { name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      roles: user.roles.map((role) => role.name),
      departments: user.department,
    }));
  }
}
