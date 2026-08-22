import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

// jwks-rsa pulls in jose, which ships ESM only and that Jest cannot parse under
// CommonJS. Nothing here verifies a signature — these tests cover the issuer
// helper and validate(), which never touch the key provider — so the module is
// stubbed rather than transforming a dependency for every suite in the project.
jest.mock("jwks-rsa", () => ({
  passportJwtSecret: () => (_req: unknown, _token: unknown, done: unknown) =>
    (done as (e: null, k: string) => void)(null, "test-key"),
}));

import { JwtStrategy, supabaseIssuer } from "./jwt.strategy";

/**
 * A trailing slash here yields `https://p.supabase.co//auth/v1`, which does not
 * match the `iss` of any real token. Every request 401s and nothing in the
 * response points at the environment variable that caused it.
 */
describe("supabaseIssuer", () => {
  it("appends the auth path to a clean url", () => {
    expect(supabaseIssuer("https://project.supabase.co")).toBe(
      "https://project.supabase.co/auth/v1",
    );
  });

  it("survives a trailing slash", () => {
    expect(supabaseIssuer("https://project.supabase.co/")).toBe(
      "https://project.supabase.co/auth/v1",
    );
  });

  it("survives several trailing slashes and stray whitespace", () => {
    expect(supabaseIssuer("  https://project.supabase.co///  ")).toBe(
      "https://project.supabase.co/auth/v1",
    );
  });
});

describe("JwtStrategy.validate", () => {
  const config = {
    get: () => "https://project.supabase.co",
  } as unknown as ConfigService;

  const strategy = new JwtStrategy(config);

  const claims = {
    sub: "3f1c0d6e-uuid",
    app_metadata: {
      app_user_id: "01JABCULID",
      roles: ["admin", "buyer"],
      department_ids: ["dept-1"],
    },
  };

  it("authorizes from the token alone", () => {
    expect(strategy.validate(claims)).toEqual({
      id: "01JABCULID",
      roles: ["admin", "buyer"],
      departmentIds: ["dept-1"],
    });
  });

  // `sub` is the Supabase UUID and nothing downstream speaks it — @GetUserId,
  // every service and every foreign key are ULIDs.
  it("returns the ULID as the id, not the supabase uuid", () => {
    expect(strategy.validate(claims)).toEqual(
      expect.objectContaining({ id: "01JABCULID" }),
    );
  });

  // GetDepartmentId reads request.user.departmentIds and falls back to the
  // first entry. The web app stopped sending the departmentId header on the
  // strength of that, so this key keeps its exact name.
  it("still exposes departmentIds for GetDepartmentId", () => {
    expect(strategy.validate(claims)).toEqual(
      expect.objectContaining({ departmentIds: ["dept-1"] }),
    );
  });

  it("treats missing role and department claims as empty, not undefined", () => {
    expect(
      strategy.validate({
        sub: "uuid",
        app_metadata: { app_user_id: "01JABCULID" },
      }),
    ).toEqual({ id: "01JABCULID", roles: [], departmentIds: [] });
  });

  // Either the token predates the migration, or the account exists in Supabase
  // Auth and was never linked to public.users. Both are rejected: letting them
  // through would mean a signed-in user with no permissions and no explanation.
  it("rejects a token with no app_user_id claim", () => {
    expect(() => strategy.validate({ sub: "unlinked-uuid" })).toThrow(
      UnauthorizedException,
    );
  });

  it("rejects app_metadata that carries roles but no app_user_id", () => {
    expect(() =>
      strategy.validate({ sub: "uuid", app_metadata: { roles: ["admin"] } }),
    ).toThrow(UnauthorizedException);
  });
});
