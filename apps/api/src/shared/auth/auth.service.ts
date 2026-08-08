import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { JwtService } from "@nestjs/jwt";
import type { role, user } from "@prisma/client";
import * as bcrypt from "bcrypt";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "../db/prisma.service";

const BCRYPT_ROUNDS = 10;

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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException("Senha atual incorreta");
    }
    await this.writePassword(userId, newPassword);
  }

  /** Admin-initiated reset: no knowledge of the current password required. */
  async resetPassword(userId: string, newPassword: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id: ${userId} not found`);
    }
    await this.writePassword(userId, newPassword);
  }

  /**
   * Stamps `passwordChangedAt` alongside the new hash. JwtStrategy refuses any
   * token issued before that instant, so a reset takes effect immediately
   * instead of leaving the old token usable until it expires.
   */
  private async writePassword(userId: string, newPassword: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
        passwordChangedAt: new Date(),
      },
    });
  }
}
