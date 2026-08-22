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
  password: "segredo",
  roles: ["buyer"],
  departmentIds: ["dept-1"],
};

const row = {
  id: "01JULID",
  name: "Maria",
  username: "maria",
  email: "maria@icmalagoas.org.br",
  roles: [{ name: "buyer" }],
  department: [{ id: "dept-1", name: "Cozinha" }],
};

interface Overrides {
  findFirst?: jest.Mock;
  findUnique?: jest.Mock;
  create?: jest.Mock;
  update?: jest.Mock;
  count?: jest.Mock;
  departmentCount?: jest.Mock;
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
    },
  } as unknown as PrismaService;

  const supabase = {
    createUser: jest.fn().mockResolvedValue({ id: "uuid-1" }),
    updateUserById: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    ...overrides.supabase,
  } as unknown as SupabaseAdminService;

  const helpers = {
    generateId: jest.fn().mockReturnValue("01JULID"),
  } as unknown as HelpersService;

  return { service: new UsersService(prisma, helpers, supabase), supabase };
}

describe("UsersService.create", () => {
  it("creates the auth account and the local row, and returns the list shape", async () => {
    const { service, supabase } = build();

    await expect(service.create(dto)).resolves.toEqual({
      id: "01JULID",
      name: "Maria",
      username: "maria",
      email: "maria@icmalagoas.org.br",
      roles: ["buyer"],
      departments: [{ id: "dept-1", name: "Cozinha" }],
    });
    expect(supabase.createUser).toHaveBeenCalledWith({
      email: dto.email,
      password: dto.password,
    });
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
    expect(supabase.createUser).not.toHaveBeenCalled();
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
    expect(supabase.createUser).not.toHaveBeenCalled();
  });
});

describe("UsersService.update", () => {
  const admin = { id: "admin-1", roles: [{ name: "admin" }] };

  it("replaces the role list rather than adding to it", async () => {
    const update = jest.fn().mockResolvedValue(row);
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      update,
    });

    await service.update("admin-1", { roles: ["admin", "buyer"] }, "admin-1");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roles: { set: [{ name: "admin" }, { name: "buyer" }] },
        }),
      }),
    );
  });

  it("refuses to let an admin demote themselves", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
    });

    await expect(
      service.update("admin-1", { roles: ["buyer"] }, "admin-1"),
    ).rejects.toThrow(/seu próprio papel/);
  });

  it("refuses to demote the last admin in the system", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      count: jest.fn().mockResolvedValue(1),
    });

    await expect(
      service.update("admin-1", { roles: ["buyer"] }, "someone-else"),
    ).rejects.toThrow(/único administrador/);
  });

  it("allows demoting an admin while another one remains", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(admin),
      count: jest.fn().mockResolvedValue(2),
    });

    await expect(
      service.update("admin-1", { roles: ["buyer"] }, "someone-else"),
    ).resolves.toBeDefined();
  });

  it("does not count admins when the target was never one", async () => {
    const count = jest.fn().mockResolvedValue(1);
    const { service } = build({
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: "user-9", roles: [{ name: "buyer" }] }),
      count,
    });

    await service.update("user-9", { roles: ["kitchen"] }, "admin-1");

    expect(count).not.toHaveBeenCalled();
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
