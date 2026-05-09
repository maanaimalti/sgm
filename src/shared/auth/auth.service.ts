import { Injectable, UnauthorizedException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { JwtService } from "@nestjs/jwt";
import type { role, user } from "@prisma/client";
import * as bcrypt from "bcrypt";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "../db/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: { username },
      include: {
        roles: true,
        department: { select: { id: true, name: true } },
      },
    });
    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: user & { roles: role[] }) {
    const data = await this.validateUser(user.username, user.password);
    if (!data) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const payload = {
      username: data.username,
      sub: data.id,
      roles: data.roles.map((role) => role.name),
      department: data.department,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
