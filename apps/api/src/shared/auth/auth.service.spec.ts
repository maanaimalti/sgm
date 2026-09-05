import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../db/prisma.service";
import type { SupabaseAdminService } from "../supabase/supabase-admin.service";
import { AuthService } from "./auth.service";

const linked = {
  email: "maria@icmalagoas.org.br",
  supabaseUserId: "uuid-1",
  mustSetPassword: true,
};

interface Overrides {
  findUnique?: jest.Mock;
  update?: jest.Mock;
  supabase?: Partial<Record<keyof SupabaseAdminService, jest.Mock>>;
}

function build(overrides: Overrides = {}) {
  const findUnique =
    overrides.findUnique ?? jest.fn().mockResolvedValue(linked);
  const update = overrides.update ?? jest.fn().mockResolvedValue({});
  const prisma = {
    user: { findUnique, update },
  } as unknown as PrismaService;

  const supabase = {
    updateUserById: jest.fn().mockResolvedValue(undefined),
    verifyPassword: jest.fn().mockResolvedValue(true),
    ...overrides.supabase,
  } as unknown as SupabaseAdminService;

  return { service: new AuthService(prisma, supabase), supabase, update };
}

describe("AuthService.setPassword", () => {
  it("sets the password and clears the flag", async () => {
    const { service, supabase, update } = build();

    await service.setPassword("01JULID", "novasenha");

    expect(supabase.updateUserById).toHaveBeenCalledWith("uuid-1", {
      password: "novasenha",
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "01JULID" },
      data: { mustSetPassword: false, passwordChangedAt: expect.any(Date) },
    });
  });

  // The ordering is the whole design. Supabase-first would leave a set
  // password behind a flag that never cleared: the person bounces back to
  // /definir-senha forever, and retyping the same password gets
  // `same_password` from GoTrue.
  it("clears the flag before calling supabase, not after", async () => {
    const updateUserById = jest.fn().mockResolvedValue(undefined);
    const { service, update } = build({ supabase: { updateUserById } });

    await service.setPassword("01JULID", "novasenha");

    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      updateUserById.mock.invocationCallOrder[0],
    );
  });

  it("puts the flag back when supabase rejects the password", async () => {
    const update = jest.fn().mockResolvedValue({});
    const { service } = build({
      update,
      supabase: {
        updateUserById: jest.fn().mockRejectedValue(new Error("weak password")),
      },
    });

    await expect(service.setPassword("01JULID", "123")).rejects.toThrow(
      "weak password",
    );
    expect(update).toHaveBeenLastCalledWith({
      where: { id: "01JULID" },
      data: { mustSetPassword: true },
    });
  });

  it("propagates the original failure, not whatever the rollback did", async () => {
    const { service } = build({
      update: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("db down")),
      supabase: {
        updateUserById: jest.fn().mockRejectedValue(new Error("weak password")),
      },
    });

    await expect(service.setPassword("01JULID", "123")).rejects.toThrow(
      "weak password",
    );
  });

  it("refuses a user that was never linked to supabase auth", async () => {
    const { service } = build({
      findUnique: jest
        .fn()
        .mockResolvedValue({ email: "a@b.com", supabaseUserId: null }),
    });

    await expect(
      service.setPassword("01JULID", "novasenha"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // Otherwise anyone holding a session could set a password without knowing
  // the current one, which is exactly what change-password exists to prevent.
  it("refuses someone who already has a password of their own", async () => {
    const { service, supabase } = build({
      findUnique: jest
        .fn()
        .mockResolvedValue({ ...linked, mustSetPassword: false }),
    });

    await expect(service.setPassword("01JULID", "novasenha")).rejects.toThrow(
      /já está definida/,
    );
    expect(supabase.updateUserById).not.toHaveBeenCalled();
  });
});

// Regression guard. setPassword exists precisely so that no "skip the check"
// branch ever lands in here; if one does, this is what notices.
describe("AuthService.changePassword", () => {
  it("still verifies the current password before changing it", async () => {
    const verifyPassword = jest.fn().mockResolvedValue(true);
    const { service, supabase } = build({ supabase: { verifyPassword } });

    await service.changePassword("01JULID", "antiga", "nova");

    expect(verifyPassword).toHaveBeenCalledWith(linked.email, "antiga");
    expect(supabase.updateUserById).toHaveBeenCalledWith("uuid-1", {
      password: "nova",
    });
  });

  it("rejects a wrong current password without touching supabase", async () => {
    const { service, supabase } = build({
      supabase: { verifyPassword: jest.fn().mockResolvedValue(false) },
    });

    await expect(
      service.changePassword("01JULID", "errada", "nova"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(supabase.updateUserById).not.toHaveBeenCalled();
  });
});
