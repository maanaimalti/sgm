import { ForbiddenException } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { GetDepartmentId, GetDepartmentIds } from "./get-department-id";

// createParamDecorator hides the factory behind route metadata; applying the
// decorator to a throwaway handler is the only way to get at it.
// biome-ignore lint/complexity/noBannedTypes: matches Nest's own decorator type
function factoryOf(decorator: Function) {
  class Probe {
    handler(@decorator() _value: unknown) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, "handler");
  return args[Object.keys(args)[0]].factory as (
    data: unknown,
    ctx: unknown,
  ) => unknown;
}

function contextWith(departmentIds: string[], headerValue?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { departmentIds },
        headers: headerValue ? { departmentid: headerValue } : {},
      }),
    }),
  };
}

describe("GetDepartmentId", () => {
  const resolve = factoryOf(GetDepartmentId);

  it("falls back to the user's first department when no header is sent", () => {
    expect(resolve(undefined, contextWith(["d1", "d2"]))).toBe("d1");
  });

  it("honours a header that names one of the user's own departments", () => {
    expect(resolve(undefined, contextWith(["d1", "d2"], "d2"))).toBe("d2");
  });

  it("rejects a header naming a department the user does not belong to", () => {
    expect(() => resolve(undefined, contextWith(["d1"], "d9"))).toThrow(
      ForbiddenException,
    );
  });

  it("rejects a user with no department at all", () => {
    expect(() => resolve(undefined, contextWith([]))).toThrow(
      ForbiddenException,
    );
  });
});

describe("GetDepartmentIds", () => {
  const resolve = factoryOf(GetDepartmentIds);

  it("returns every department on the token, ignoring the header", () => {
    expect(resolve(undefined, contextWith(["d1", "d2"], "d9"))).toEqual([
      "d1",
      "d2",
    ]);
  });

  it("rejects a user with no department at all", () => {
    expect(() => resolve(undefined, contextWith([]))).toThrow(
      ForbiddenException,
    );
  });
});
