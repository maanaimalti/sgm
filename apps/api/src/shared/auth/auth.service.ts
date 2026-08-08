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

/** A user that passed LocalStrategy — everything but the password hash. */
export type AuthenticatedUser = Omit<user, "password"> & {
  roles: role[];
  department: { id: string; name: string }[];
};

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prismaService.user.findUnique({
      where: { username },
      include: {
        roles: true,
        department: { select: { id: true, name: true } },
      },
    });
    // A null hash means the account exists only in Supabase Auth, which owns
    // its password. Such a user can never sign in through this route.
    if (user?.password && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Mints the token for a user LocalStrategy has already authenticated. It does
   * not re-check the password — the request no longer carries one, because
   * validateUser strips the hash before handing the user back.
   */
  login(user: AuthenticatedUser) {
    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles.map((role) => role.name),
      department: user.department,
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
    if (!user?.password) {
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
