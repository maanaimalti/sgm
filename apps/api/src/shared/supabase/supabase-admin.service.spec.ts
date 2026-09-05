import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../db/prisma.service";
import { SupabaseAdminService } from "./supabase-admin.service";

const env: Record<string, string> = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const config = { get: (key: string) => env[key] } as ConfigService;

// Only revokeSessions reaches for Prisma, and it does so with raw SQL against
// the auth schema — everything else here never touches it.
const prisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
} as unknown as PrismaService;

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
  const service = new SupabaseAdminService(config, prisma);
  // biome-ignore lint/suspicious/noExplicitAny: reaching into the private client
  (service as any).admin = { auth: { admin } };
  return service;
}

const failing = (error: FakeError) =>
  jest.fn().mockResolvedValue({ data: { user: null }, error });

describe("SupabaseAdminService", () => {
  describe("inviteUserByEmail", () => {
    it("returns the id of the invited auth user", async () => {
      const service = serviceWith({
        inviteUserByEmail: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "uuid-1" } }, error: null }),
      });

      await expect(service.inviteUserByEmail("a@b.com")).resolves.toEqual({
        id: "uuid-1",
      });
    });

    it("does not confirm the address — an unconfirmed account is what makes a resend possible", async () => {
      const inviteUserByEmail = jest
        .fn()
        .mockResolvedValue({ data: { user: { id: "uuid-1" } }, error: null });
      const service = serviceWith({ inviteUserByEmail });

      await service.inviteUserByEmail("a@b.com");

      expect(inviteUserByEmail).toHaveBeenCalledWith("a@b.com");
    });

    // resendInvite branches on this exact status to fall back to a recovery
    // link. Downgrade it and every resend to an accepted user 500s.
    it("maps a duplicate address to 409", async () => {
      const service = serviceWith({
        inviteUserByEmail: failing({
          message: "A user with this email address has already been registered",
          status: 422,
          code: "email_exists",
        }),
      });

      await expect(service.inviteUserByEmail("a@b.com")).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("maps the e-mail send rate limit to 429 with an actionable message", async () => {
      const service = serviceWith({
        inviteUserByEmail: failing({
          message: "For security purposes, you can only request this once",
          status: 429,
          code: "over_email_send_rate_limit",
        }),
      });

      await expect(service.inviteUserByEmail("a@b.com")).rejects.toMatchObject({
        status: 429,
      });
      await expect(service.inviteUserByEmail("a@b.com")).rejects.toThrow(
        /Espere um minuto/,
      );
    });

    it("maps a rejected address to 400", async () => {
      const service = serviceWith({
        inviteUserByEmail: failing({
          message: "Email address is invalid",
          status: 400,
          code: "email_address_invalid",
        }),
      });

      await expect(service.inviteUserByEmail("a@b.com")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    // The built-in mailer only delivers to the Supabase team's own addresses.
    // There is no error code for the refusal, so the message is all we have.
    it("names the missing SMTP configuration instead of a bare 500", async () => {
      const service = serviceWith({
        inviteUserByEmail: failing({
          message: "Email address not authorized",
          status: 403,
        }),
      });

      await expect(service.inviteUserByEmail("a@b.com")).rejects.toThrow(
        /SMTP próprio/,
      );
    });

    it("hides an unexpected failure behind a 500", async () => {
      const service = serviceWith({
        inviteUserByEmail: failing({ message: "boom", status: 503 }),
      });

      await expect(service.inviteUserByEmail("a@b.com")).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it("refuses a success response that carries no user", async () => {
      const service = serviceWith({
        inviteUserByEmail: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      });

      await expect(service.inviteUserByEmail("a@b.com")).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  describe("translate", () => {
    it("maps a missing account to 404", async () => {
      const service = serviceWith({
        deleteUser: failing({
          message: "User not found",
          status: 404,
          code: "user_not_found",
        }),
      });

      await expect(service.deleteUser("uuid-1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
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

  describe("sendPasswordRecovery", () => {
    // Deliberately on the anon client: /recover is not an admin route, and
    // that client carries no PKCE flow state, so the link it produces is one
    // the invitee's browser can actually redeem.
    it("goes through the anon client", async () => {
      const resetPasswordForEmail = jest
        .fn()
        .mockResolvedValue({ data: {}, error: null });
      const service = new SupabaseAdminService(config, prisma);
      // biome-ignore lint/suspicious/noExplicitAny: reaching into the private client
      (service as any).anon = { auth: { resetPasswordForEmail } };

      await service.sendPasswordRecovery("a@b.com");

      expect(resetPasswordForEmail).toHaveBeenCalledWith("a@b.com");
    });

    it("translates a failure instead of resolving quietly", async () => {
      const service = new SupabaseAdminService(config, prisma);
      // biome-ignore lint/suspicious/noExplicitAny: reaching into the private client
      (service as any).anon = {
        auth: {
          resetPasswordForEmail: jest.fn().mockResolvedValue({
            data: {},
            error: { message: "nope", status: 400 },
          }),
        },
      };

      await expect(
        service.sendPasswordRecovery("a@b.com"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("setAppMetadata", () => {
    // app_metadata is one JSON column. Writing only our keys would drop
    // anything Supabase or a later feature put beside them.
    it("merges onto what is already there instead of replacing it", async () => {
      const updateUserById = jest
        .fn()
        .mockResolvedValue({ data: { user: {} }, error: null });
      const service = serviceWith({
        getUserById: jest.fn().mockResolvedValue({
          data: { user: { app_metadata: { provider: "email" } } },
          error: null,
        }),
        updateUserById,
      });

      await service.setAppMetadata("uuid-1", {
        app_user_id: "01JULID",
        roles: ["admin"],
        department_ids: ["dept-1"],
      });

      expect(updateUserById).toHaveBeenCalledWith("uuid-1", {
        app_metadata: {
          provider: "email",
          app_user_id: "01JULID",
          roles: ["admin"],
          department_ids: ["dept-1"],
        },
      });
    });

    it("translates a failed read rather than writing over nothing", async () => {
      const updateUserById = jest.fn();
      const service = serviceWith({
        getUserById: failing({ message: "nope", status: 400 }),
        updateUserById,
      });

      await expect(
        service.setAppMetadata("uuid-1", {
          app_user_id: "01JULID",
          roles: [],
          department_ids: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(updateUserById).not.toHaveBeenCalled();
    });
  });

  describe("listAllUsers", () => {
    const page = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `uuid-${i}`,
        email: `u${i}@b.com`,
        app_metadata: { roles: ["buyer"] },
      }));

    it("keeps paging until a short page comes back", async () => {
      const listUsers = jest
        .fn()
        .mockResolvedValueOnce({ data: { users: page(200) }, error: null })
        .mockResolvedValueOnce({ data: { users: page(3) }, error: null });
      const service = serviceWith({ listUsers });

      await expect(service.listAllUsers()).resolves.toHaveLength(203);
      expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 200 });
      expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 200 });
    });

    it("memoizes, because the notification fan-out asks once per event", async () => {
      const listUsers = jest
        .fn()
        .mockResolvedValue({ data: { users: page(1) }, error: null });
      const service = serviceWith({ listUsers });

      await service.listAllUsers();
      await service.listAllUsers();

      expect(listUsers).toHaveBeenCalledTimes(1);
    });

    it("re-reads once the memo is dropped", async () => {
      const listUsers = jest
        .fn()
        .mockResolvedValue({ data: { users: page(1) }, error: null });
      const service = serviceWith({ listUsers });

      await service.listAllUsers();
      service.invalidateUserCache();
      await service.listAllUsers();

      expect(listUsers).toHaveBeenCalledTimes(2);
    });
  });

  describe("revokeSessions", () => {
    // There is no supported call for this: auth.admin.signOut wants the user's
    // own access token, which the server never holds.
    it("deletes the auth sessions through Prisma", async () => {
      const service = serviceWith({});

      await service.revokeSessions("uuid-1");

      expect(prisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("verifyPassword", () => {
    function serviceWithAnon(signInWithPassword: jest.Mock) {
      const service = new SupabaseAdminService(config, prisma);
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
