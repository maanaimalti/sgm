import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { passportJwtSecret } from "jwks-rsa";
import { ExtractJwt, Strategy } from "passport-jwt";

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

/**
 * Only the parts this app reads. `app_metadata` is absent on tokens minted
 * before the authorization migration — see the fallback in `validate`.
 */
interface JwtPayload {
  sub: string;
  app_metadata?: {
    app_user_id?: string;
    roles?: string[];
    department_ids?: string[];
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
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
   * Authorization comes off the token, and nowhere else.
   *
   * `app_metadata` is written only by the service role — the API, through
   * `UsersService` — so the browser cannot forge it, and Supabase puts it in
   * every access token it mints. That is what lets RLS policies and Realtime
   * authorize the same way this does; they run inside Postgres and can never
   * reach `request.user`.
   *
   * There is no database read here at all any more. A token with no
   * `app_user_id` is either older than the migration or belongs to an account
   * that was never linked to `public.users`; both are rejected, which turns a
   * missed `auth:sync-roles` into a loud failure at sign-in rather than a user
   * who is quietly allowed in with no permissions.
   *
   * The cost is that a role change only lands on the next token. `update()`
   * revokes the user's sessions so the refresh path cannot extend the old one,
   * which bounds the gap at one access-token lifetime — keep that expiry short
   * in the dashboard.
   */
  validate(payload: JwtPayload) {
    const metadata = payload.app_metadata;

    if (!metadata?.app_user_id) {
      throw new UnauthorizedException();
    }

    return {
      id: metadata.app_user_id,
      roles: metadata.roles ?? [],
      departmentIds: metadata.department_ids ?? [],
    };
  }
}
