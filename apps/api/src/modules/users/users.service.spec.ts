import { BadRequestException, ConflictException } from "@nestjs/common";
import type { PrismaService } from "src/shared/db/prisma.service";
import type { HelpersService } from "src/shared/helpers/helpers.service";
import type { SupabaseAdminService } from "src/shared/supabase/supabase-admin.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import { UsersService } from "./users.service";

const dto: CreateUserDto = {
  name: "Maria",
  username: "maria",
  email: "maria@icmalagoas.org.br",
  roles: ["buyer"],
  departmentIds: ["dept-1"],
};

const row = {
  id: "01JULID",
  name: "Maria",
  username: "maria",
  email: "maria@icmalagoas.org.br",
  mustSetPassword: true,
};

/** What the auth account carries — roles and setores live there now. */
const metadata = {
  app_user_id: "01JULID",
  roles: ["buyer"],
  department_ids: ["dept-1"],
};

interface Overrides {
  findFirst?: jest.Mock;
  findUnique?: jest.Mock;
  create?: jest.Mock;
  update?: jest.Mock;
  count?: jest.Mock;
  departmentCount?: jest.Mock;
  departmentFindMany?: jest.Mock;
  supabase?: Partial<Record<keyof SupabaseAdminService, jest.Mock>>;
}

function build(overrides: Overrides = {}) {
  const prisma = {
    user: {
      findFirst: overrides.findFirst ?? jest.fn().mockResolvedValue(null),
      findUnique: overrides.findUnique ?? jest.fn().mockResolvedValue(null),
      create: overrides.create ?? jest.fn().mockResolvedValue(row),
      update: overrides.update ?? jest.fn().mockResolvedValue(row),
      count: overrides.count ?? jest.fn().mockResolvedValue(2),
    },
    department: {
      count: overrides.departmentCount ?? jest.fn().mockResolvedValue(1),
      findMany:
        overrides.departmentFindMany ??
        jest.fn().mockResolvedValue([{ id: "dept-1", name: "Cozinha" }]),
    },
  } as unknown as PrismaService;

  const supabase = {
    inviteUserByEmail: jest.fn().mockResolvedValue({ id: "uuid-1" }),
    sendPasswordRecovery: jest.fn().mockResolvedValue(undefined),
    updateUserById: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    setAppMetadata: jest.fn().mockResolvedValue(undefined),
    revokeSessions: jest.fn().mockResolvedValue(undefined),
    invalidateUserCache: jest.fn(),
    findAppMetadata: jest.fn().mockResolvedValue(metadata),
    findUserIdsByRole: jest.fn().mockResolvedValue(["01JULID", "other"]),
    ...overrides.supabase,
  } as unknown as SupabaseAdminService;

  const helpers = {
    generateId: jest.fn().mockReturnValue("01JULID"),
  } as unknown as HelpersService;

  return {
    service: new UsersService(prisma, helpers, supabase),
    supabase,
    prisma,
  };
}

describe("UsersService.create", () => {
  it("invites the account and creates the local row, and returns the list shape", async () => {
    const { service, supabase } = build();

    await expect(service.create(dto)).resolves.toEqual({
      id: "01JULID",
      name: "Maria",
      username: "maria",
      email: "maria@icmalagoas.org.br",
      roles: ["buyer"],
      departments: [{ id: "dept-1", name: "Cozinha" }],
      mustSetPassword: true,
    });
    expect(supabase.inviteUserByEmail).toHaveBeenCalledWith(dto.email);
  });

  it("marks the new row as still owing a password", async () => {
    const create = jest.fn().mockResolvedValue(row);
    const { service } = build({ create });

    await service.create(dto);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mustSetPassword: true }),
      }),
    );
  });

  // The six migrated accounts still carry one of these. Inviting them burns
  // the project's e-mail rate limit and returns a bounce, not an error.
  it("refuses a placeholder address before touching supabase", async () => {
    const { service, supabase } = build();

    await expect(
      service.create({ ...dto, email: "maria@sgm.icmalagoas.org.br" }),
    ).rejects.toThrow(/provisório/);
    expect(supabase.inviteUserByEmail).not.toHaveBeenCalled();
  });

  // The compensation branch. It has no other way of running before production:
  // getting here for real means Postgres rejecting a write that the pre-check
  // said would succeed.
  it("deletes the auth account when the local insert fails", async () => {
    const { service, supabase } = build({
      create: jest.fn().mockRejectedValue(new Error("unique violation")),
    });

    await expect(service.create(dto)).rejects.toThrow("unique violation");
    expect(supabase.deleteUser).toHaveBeenCalledWith("uuid-1");
  });

  it("propagates the original failure, not whatever the cleanup did", async () => {
    const { service } = build({
      create: jest.fn().mockRejectedValue(new Error("unique violation")),
      supabase: {
        deleteUser: jest.fn().mockRejectedValue(new Error("cleanup exploded")),
      },
    });

    await expect(service.create(dto)).rejects.toThrow("unique violation");
  });

  it("rejects a duplicate username before touching supabase", async () => {
    const { service, supabase } = build({
      findFirst: jest.fn().mockResolvedValue({ username: "maria" }),
    });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(supabase.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("names the e-mail when that is what collided", async () => {
    const { service } = build({
      findFirst: jest.fn().mockResolvedValue({ username: "outro" }),
    });

    await expect(service.create(dto)).rejects.toThrow(/e-mail/);
  });

  it("rejects an unknown department instead of failing on connect", async () => {
    const { service, supabase } = build({
      departmentCount: jest.fn().mockResolvedValue(0),
    });

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(supabase.inviteUserByEmail).not.toHaveBeenCalled();
  });
});

describe("UsersService.update", () => {
  const admin = { id: "admin-1", supabaseUserId: "uuid-1" };
  const adminMetadata = {
    app_user_id: "admin-1",
    roles: ["admin"],
    department_ids: ["dept-1"],
  };

  // The payload is the full desired list, so removing a role has to be
  // possible — and app_metadata is overwritten, never merged, for that reason.
  it("replaces the role list rather than adding to it", async () => {
    const setAppMetadata = jest.fn().mockResolvedValue(undefined);
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      supabase: { setAppMetadata },
    });

    await service.update("admin-1", { roles: ["admin", "buyer"] }, "admin-1");

    expect(setAppMetadata).toHaveBeenCalledWith(
      "uuid-1",
      expect.objectContaining({ roles: ["admin", "buyer"] }),
    );
  });

  // A partial edit must not silently strip what it did not mention — there is
  // no row left to fall back on.
  it("keeps the setores when only the roles are sent", async () => {
    const setAppMetadata = jest.fn().mockResolvedValue(undefined);
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      supabase: {
        setAppMetadata,
        findAppMetadata: jest.fn().mockResolvedValue({
          app_user_id: "admin-1",
          roles: ["admin"],
          department_ids: ["dept-7"],
        }),
      },
    });

    await service.update("admin-1", { roles: ["admin"] }, "admin-1");

    expect(setAppMetadata).toHaveBeenCalledWith(
      "uuid-1",
      expect.objectContaining({ department_ids: ["dept-7"] }),
    );
  });

  it("refuses to let an admin demote themselves", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      supabase: { findAppMetadata: jest.fn().mockResolvedValue(adminMetadata) },
    });

    await expect(
      service.update("admin-1", { roles: ["buyer"] }, "admin-1"),
    ).rejects.toThrow(/seu próprio papel/);
  });

  it("refuses to demote the last admin in the system", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      supabase: {
        findAppMetadata: jest.fn().mockResolvedValue(adminMetadata),
        findUserIdsByRole: jest.fn().mockResolvedValue(["admin-1"]),
      },
    });

    await expect(
      service.update("admin-1", { roles: ["buyer"] }, "someone-else"),
    ).rejects.toThrow(/único administrador/);
  });

  it("allows demoting an admin while another one remains", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      supabase: {
        findAppMetadata: jest.fn().mockResolvedValue(adminMetadata),
        findUserIdsByRole: jest.fn().mockResolvedValue(["admin-1", "admin-2"]),
      },
    });

    await expect(
      service.update("admin-1", { roles: ["buyer"] }, "someone-else"),
    ).resolves.toBeDefined();
  });

  it("does not count admins when the target was never one", async () => {
    const findUserIdsByRole = jest.fn().mockResolvedValue(["admin-1"]);
    const { service } = build({
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: "user-9", supabaseUserId: "uuid-9" }),
      supabase: {
        findUserIdsByRole,
        findAppMetadata: jest.fn().mockResolvedValue({
          app_user_id: "user-9",
          roles: ["buyer"],
          department_ids: [],
        }),
      },
    });

    await service.update("user-9", { roles: ["kitchen"] }, "admin-1");

    expect(findUserIdsByRole).not.toHaveBeenCalled();
  });

  // The whole point of moving authorization onto the token: the edit is
  // pointless until the token says so, and the old sessions have to go or the
  // person keeps the old roles until their refresh happens to expire.
  it("pushes the new roles onto the token and ends the old sessions", async () => {
    const setAppMetadata = jest.fn().mockResolvedValue(undefined);
    const revokeSessions = jest.fn().mockResolvedValue(undefined);
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      supabase: {
        setAppMetadata,
        revokeSessions,
        findAppMetadata: jest.fn().mockResolvedValue(adminMetadata),
      },
    });

    await service.update("admin-1", { roles: ["admin"] }, "admin-1");

    expect(setAppMetadata).toHaveBeenCalledWith("uuid-1", {
      app_user_id: "admin-1",
      roles: ["admin"],
      department_ids: ["dept-1"],
    });
    expect(revokeSessions).toHaveBeenCalledWith("uuid-1");
  });

  // The local row is already written by then. A 500 here would tell the admin
  // the edit failed when it did not.
  it("does not fail the edit when the token write does", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      supabase: {
        findAppMetadata: jest.fn().mockResolvedValue(adminMetadata),
        setAppMetadata: jest.fn().mockRejectedValue(new Error("auth down")),
      },
    });

    await expect(
      service.update("admin-1", { roles: ["admin"] }, "admin-1"),
    ).resolves.toBeDefined();
  });
});

describe("UsersService.updateEmail", () => {
  const linked = {
    email: "antigo@sgm.icmalagoas.org.br",
    supabaseUserId: "uuid-1",
  };

  // Without email_confirm the change becomes a pending request and GoTrue mails
  // a link — to the placeholder address this feature exists to replace.
  it("marks the new address confirmed", async () => {
    const { service, supabase } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
    });

    await service.updateEmail("01JULID", "real@icmalagoas.org.br");

    expect(supabase.updateUserById).toHaveBeenCalledWith("uuid-1", {
      email: "real@icmalagoas.org.br",
      email_confirm: true,
    });
  });

  it("puts the old address back when the local update fails", async () => {
    const { service, supabase } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
      update: jest.fn().mockRejectedValue(new Error("unique violation")),
    });

    await expect(
      service.updateEmail("01JULID", "real@icmalagoas.org.br"),
    ).rejects.toThrow("unique violation");
    expect(supabase.updateUserById).toHaveBeenLastCalledWith("uuid-1", {
      email: linked.email,
      email_confirm: true,
    });
  });

  it("refuses a user that was never linked to supabase auth", async () => {
    const { service } = build({
      findUnique: jest
        .fn()
        .mockResolvedValue({ email: "a@b.com", supabaseUserId: null }),
    });

    await expect(service.updateEmail("01JULID", "real@b.com")).rejects.toThrow(
      /auth:provision/,
    );
  });
});

describe("UsersService.resetPassword", () => {
  const linked = { email: "maria@icmalagoas.org.br", supabaseUserId: "uuid-1" };

  it("marks the password as still owed, so a handed-over one gets replaced", async () => {
    const update = jest.fn().mockResolvedValue(row);
    const { service, supabase } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
      update,
    });

    await service.resetPassword("01JULID", "provisoria");

    expect(supabase.updateUserById).toHaveBeenCalledWith("uuid-1", {
      password: "provisoria",
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "01JULID" },
      data: { mustSetPassword: true },
    });
  });

  it("skips the flag when the caller opts out", async () => {
    const update = jest.fn().mockResolvedValue(row);
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
      update,
    });

    await service.resetPassword("01JULID", "provisoria", false);

    expect(update).not.toHaveBeenCalled();
  });

  // The flag only adds friction. Failing to write it must never fail the reset
  // itself — this is the break-glass path when no e-mail can be delivered.
  it("still succeeds when the flag write fails", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
      update: jest.fn().mockRejectedValue(new Error("db down")),
    });

    await expect(
      service.resetPassword("01JULID", "provisoria"),
    ).resolves.toBeUndefined();
  });
});

describe("UsersService.resendInvite", () => {
  const linked = { email: "maria@icmalagoas.org.br", supabaseUserId: "uuid-1" };

  it("re-sends the invite while the account is unconfirmed", async () => {
    const { service, supabase } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
    });

    await expect(service.resendInvite("01JULID")).resolves.toEqual({
      ok: true,
      channel: "invite",
    });
    expect(supabase.sendPasswordRecovery).not.toHaveBeenCalled();
  });

  it("sets the flag before sending, not after", async () => {
    const update = jest.fn().mockResolvedValue(row);
    const inviteUserByEmail = jest.fn().mockResolvedValue({ id: "uuid-1" });
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
      update,
      supabase: { inviteUserByEmail },
    });

    await service.resendInvite("01JULID");

    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      inviteUserByEmail.mock.invocationCallOrder[0],
    );
  });

  // Once the person accepts an invite they are confirmed, and GoTrue refuses
  // to invite them again. A recovery link lands on the same screen.
  it("falls back to a recovery link when the address is already confirmed", async () => {
    const { service, supabase } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
      supabase: {
        inviteUserByEmail: jest
          .fn()
          .mockRejectedValue(new ConflictException("já existe")),
      },
    });

    await expect(service.resendInvite("01JULID")).resolves.toEqual({
      ok: true,
      channel: "recovery",
    });
    expect(supabase.sendPasswordRecovery).toHaveBeenCalledWith(linked.email);
  });

  it("keeps the flag set on the recovery fallback", async () => {
    const update = jest.fn().mockResolvedValue(row);
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
      update,
      supabase: {
        inviteUserByEmail: jest
          .fn()
          .mockRejectedValue(new ConflictException("já existe")),
      },
    });

    await service.resendInvite("01JULID");

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: "01JULID" },
      data: { mustSetPassword: true },
    });
  });

  it("puts the flag back when nothing was sent", async () => {
    const update = jest.fn().mockResolvedValue(row);
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(linked),
      update,
      supabase: {
        inviteUserByEmail: jest.fn().mockRejectedValue(new Error("smtp down")),
      },
    });

    await expect(service.resendInvite("01JULID")).rejects.toThrow("smtp down");
    expect(update).toHaveBeenLastCalledWith({
      where: { id: "01JULID" },
      data: { mustSetPassword: false },
    });
  });

  it("refuses a placeholder address", async () => {
    const { service, supabase } = build({
      findUnique: jest.fn().mockResolvedValue({
        email: "maria@sgm.icmalagoas.org.br",
        supabaseUserId: "uuid-1",
      }),
    });

    await expect(service.resendInvite("01JULID")).rejects.toThrow(/provisório/);
    expect(supabase.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("refuses a user that was never linked to supabase auth", async () => {
    const { service } = build({
      findUnique: jest
        .fn()
        .mockResolvedValue({ email: "a@b.com", supabaseUserId: null }),
    });

    await expect(service.resendInvite("01JULID")).rejects.toThrow(
      /auth:provision/,
    );
  });
});
