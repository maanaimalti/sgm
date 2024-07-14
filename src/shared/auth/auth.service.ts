import { Injectable } from '@nestjs/common';
// biome-ignore lint/style/useImportType: <explanation>
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: { username },
    });
    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, roles: user.roles };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
