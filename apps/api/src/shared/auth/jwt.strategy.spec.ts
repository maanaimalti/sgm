import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../db/prisma.service";

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

  function strategyFor(user: unknown) {
    const findUnique = jest.fn().mockResolvedValue(user);
    const prisma = { user: { findUnique } } as unknown as PrismaService;
    return { strategy: new JwtStrategy(prisma, config), findUnique };
  }

  const row = {
    id: "01JABCULID",
    name: "Maria",
    username: "maria",
    email: "maria@icmalagoas.org.br",
    roles: [{ name: "admin" }, { name: "buyer" }],
    department: [{ id: "dept-1", name: "Cozinha" }],
  };

  it("resolves the local user through the supabase link column", async () => {
    const { strategy, findUnique } = strategyFor(row);

    await strategy.validate({ sub: "3f1c0d6e-uuid" });

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { supabaseUserId: "3f1c0d6e-uuid" } }),
    );
  });

  it("returns the ULID as the id, not the supabase uuid", async () => {
    const { strategy } = strategyFor(row);

    await expect(strategy.validate({ sub: "3f1c0d6e-uuid" })).resolves.toEqual(
      expect.objectContaining({ id: "01JABCULID" }),
    );
  });

  it("flattens the roles into names, which is what RolesGuard reads", async () => {
    const { strategy } = strategyFor(row);

    await expect(strategy.validate({ sub: "uuid" })).resolves.toEqual(
      expect.objectContaining({ roles: ["admin", "buyer"] }),
    );
  });

  // GetDepartmentId reads request.user.departmentIds and falls back to the
  // first entry. The web app stopped sending the departmentId header on the
  // strength of that, so this key keeps its exact name.
  it("still exposes departmentIds for GetDepartmentId", async () => {
    const { strategy } = strategyFor(row);

    await expect(strategy.validate({ sub: "uuid" })).resolves.toEqual(
      expect.objectContaining({ departmentIds: ["dept-1"] }),
    );
  });

  it("also exposes the named departments, which GET /auth/me hands the browser", async () => {
    const { strategy } = strategyFor(row);

    await expect(strategy.validate({ sub: "uuid" })).resolves.toEqual(
      expect.objectContaining({
        departments: [{ id: "dept-1", name: "Cozinha" }],
      }),
    );
  });

  // The failure mode this migration introduces: an account that exists in
  // Supabase Auth but was never linked to public.users. Rejecting it is what
  // turns a missed provisioning run into a loud failure at first login.
  it("rejects a token whose subject matches no local user", async () => {
    const { strategy } = strategyFor(null);

    await expect(strategy.validate({ sub: "unlinked-uuid" })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
