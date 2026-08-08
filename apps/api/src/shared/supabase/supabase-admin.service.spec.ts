import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { SupabaseAdminService } from "./supabase-admin.service";

const env: Record<string, string> = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const config = { get: (key: string) => env[key] } as ConfigService;

interface FakeError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * The admin API is replaced wholesale. What is under test is the translation
 * layer: supabase-js resolves with `{ data, error }` instead of throwing, so a
 * failure that is not explicitly translated reads as success.
 */
function serviceWith(admin: Record<string, jest.Mock>) {
  const service = new SupabaseAdminService(config);
  // biome-ignore lint/suspicious/noExplicitAny: reaching into the private client
  (service as any).admin = { auth: { admin } };
  return service;
}

const failing = (error: FakeError) =>
  jest.fn().mockResolvedValue({ data: { user: null }, error });

describe("SupabaseAdminService", () => {
  describe("createUser", () => {
    it("returns the id of the created auth user", async () => {
      const service = serviceWith({
        createUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "uuid-1" } }, error: null }),
      });

      await expect(
        service.createUser({ email: "a@b.com", password: "secret" }),
      ).resolves.toEqual({ id: "uuid-1" });
    });

    it("confirms the address, so the account can sign in straight away", async () => {
      const createUser = jest
        .fn()
        .mockResolvedValue({ data: { user: { id: "uuid-1" } }, error: null });
      const service = serviceWith({ createUser });

      await service.createUser({ email: "a@b.com", password: "secret" });

      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email_confirm: true }),
      );
    });

    it("maps a duplicate address to 409", async () => {
      const service = serviceWith({
        createUser: failing({
          message: "A user with this email address has already been registered",
          status: 422,
          code: "email_exists",
        }),
      });

      await expect(
        service.createUser({ email: "a@b.com", password: "secret" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("maps a rejected payload to 400 and keeps the reason", async () => {
      const service = serviceWith({
        createUser: failing({
          message: "Password should be at least 6 characters",
          status: 400,
        }),
      });

      await expect(
        service.createUser({ email: "a@b.com", password: "x" }),
      ).rejects.toThrow(/at least 6 characters/);
      await expect(
        service.createUser({ email: "a@b.com", password: "x" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("maps rate limiting to 429 rather than a generic failure", async () => {
      const service = serviceWith({
        createUser: failing({
          message: "Email rate limit exceeded",
          status: 429,
        }),
      });

      await expect(
        service.createUser({ email: "a@b.com", password: "secret" }),
      ).rejects.toMatchObject({ status: 429 });
    });

    it("hides an unexpected failure behind a 500", async () => {
      const service = serviceWith({
        createUser: failing({ message: "boom", status: 503 }),
      });

      await expect(
        service.createUser({ email: "a@b.com", password: "secret" }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it("refuses a success response that carries no user", async () => {
      const service = serviceWith({
        createUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      });

      await expect(
        service.createUser({ email: "a@b.com", password: "secret" }),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe("updateUserById", () => {
    it("passes the attributes through untouched", async () => {
      const updateUserById = jest
        .fn()
        .mockResolvedValue({ data: { user: {} }, error: null });
      const service = serviceWith({ updateUserById });

      await service.updateUserById("uuid-1", {
        email: "new@b.com",
        email_confirm: true,
      });

      expect(updateUserById).toHaveBeenCalledWith("uuid-1", {
        email: "new@b.com",
        email_confirm: true,
      });
    });

    it("translates a failure instead of resolving quietly", async () => {
      const service = serviceWith({
        updateUserById: failing({ message: "nope", status: 400 }),
      });

      await expect(
        service.updateUserById("uuid-1", { password: "secret" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("verifyPassword", () => {
    function serviceWithAnon(signInWithPassword: jest.Mock) {
      const service = new SupabaseAdminService(config);
      // biome-ignore lint/suspicious/noExplicitAny: reaching into the private client
      (service as any).anon = { auth: { signInWithPassword } };
      return service;
    }

    it("is true when the credentials are accepted", async () => {
      const service = serviceWithAnon(
        jest.fn().mockResolvedValue({ data: {}, error: null }),
      );

      await expect(service.verifyPassword("a@b.com", "right")).resolves.toBe(
        true,
      );
    });

    it("is false — not an error — when they are rejected", async () => {
      const service = serviceWithAnon(
        jest.fn().mockResolvedValue({
          data: {},
          error: { message: "Invalid login credentials", status: 400 },
        }),
      );

      await expect(service.verifyPassword("a@b.com", "wrong")).resolves.toBe(
        false,
      );
    });

    it("still throws when the failure is not about the credentials", async () => {
      const service = serviceWithAnon(
        jest.fn().mockResolvedValue({
          data: {},
          error: { message: "upstream down", status: 503 },
        }),
      );

      await expect(
        service.verifyPassword("a@b.com", "right"),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });
});
