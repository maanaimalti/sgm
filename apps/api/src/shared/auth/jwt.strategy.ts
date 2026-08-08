import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../db/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prismaService: PrismaService,
    config: ConfigService,
  ) {
    const secret = config.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        username: true,
        passwordChangedAt: true,
        roles: { select: { name: true } },
        department: { select: { id: true } },
      },
    });
    if (!user) throw new UnauthorizedException();
    if (issuedBeforePasswordChange(payload.iat, user.passwordChangedAt)) {
      throw new UnauthorizedException("Password changed — sign in again");
    }
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      roles: user.roles.map((role) => role.name),
      departmentIds: user.department.map((department) => department.id),
    };
  }
}

/**
 * Retires every token minted before the user's last password change, so a reset
 * logs the old sessions out at once instead of after the token's natural TTL.
 *
 * Both sides are compared in whole seconds: `iat` is already floored to the
 * second, so comparing it against a millisecond timestamp would reject a token
 * issued in the same second as the change — including the fresh one the user
 * gets when they sign back in.
 */
export function issuedBeforePasswordChange(
  issuedAtInSeconds: number | undefined,
  passwordChangedAt: Date | null,
): boolean {
  if (!passwordChangedAt) return false;
  if (!issuedAtInSeconds) return true;
  return Math.floor(passwordChangedAt.getTime() / 1000) > issuedAtInSeconds;
}
