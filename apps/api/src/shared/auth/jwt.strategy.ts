import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { passportJwtSecret } from "jwks-rsa";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../db/prisma.service";

/** Supabase mints this audience for every signed-in end user. */
const SUPABASE_AUDIENCE = "authenticated";

/**
 * A trailing slash on SUPABASE_URL produces an issuer that will not match the
 * token's `iss`, and the only symptom is 401 on every request with nothing
 * naming the cause. env.validation normalizes the variable at boot; this is the
 * second line of defence, and the one that is unit-tested.
 */
export function supabaseIssuer(url: string): string {
  return `${url.trim().replace(/\/+$/, "")}/auth/v1`;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prismaService: PrismaService,
    config: ConfigService,
  ) {
    const url = config.get<string>("SUPABASE_URL");
    if (!url) {
      throw new Error("SUPABASE_URL environment variable is required");
    }
    const issuer = supabaseIssuer(url);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Pinned to the ECC P-256 key selected in the dashboard. Adding an RSA
      // key there without adding "RS256" here 401s every new token.
      algorithms: ["ES256"],
      audience: SUPABASE_AUDIENCE,
      issuer,
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: `${issuer}/.well-known/jwks.json`,
        cache: true,
        // Key rotation is a manual action in Supabase, so caching for an hour
        // means a blip on the JWKS endpoint cannot take authentication down.
        cacheMaxAge: 3_600_000,
        cacheMaxEntries: 5,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      }),
    });
  }

  /**
   * `sub` is the Supabase UUID; everything downstream — @Roles, @GetUserId,
   * @GetDepartmentId — speaks in ULIDs, so the link column is what bridges
   * them. The claims in the token are never trusted for authorization: roles
   * and departments are read here, per request, straight from the database.
   */
  async validate(payload: { sub: string }) {
    const user = await this.prismaService.user.findUnique({
      where: { supabaseUserId: payload.sub },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        roles: { select: { name: true } },
        department: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      roles: user.roles.map((role) => role.name),
      departments: user.department,
      departmentIds: user.department.map((department) => department.id),
    };
  }
}
