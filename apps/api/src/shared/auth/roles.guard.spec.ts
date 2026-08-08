import { Reflector } from "@nestjs/core";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";

@Roles("admin")
class ClassLevelController {
  handler() {}
}

class HandlerLevelController {
  @Roles("kitchen", "admin")
  handler() {}
}

class UnguardedController {
  handler() {}
}

function contextFor(
  controller: new () => { handler: () => void },
  roles: string[],
) {
  return {
    getHandler: () => controller.prototype.handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
  } as never;
}

describe("RolesGuard", () => {
  const guard = new RolesGuard(new Reflector());

  it("enforces @Roles declared on the controller class", () => {
    expect(guard.canActivate(contextFor(ClassLevelController, ["admin"]))).toBe(
      true,
    );
    expect(
      guard.canActivate(contextFor(ClassLevelController, ["kitchen"])),
    ).toBe(false);
  });

  it("still enforces @Roles declared on the handler", () => {
    expect(
      guard.canActivate(contextFor(HandlerLevelController, ["kitchen"])),
    ).toBe(true);
    expect(
      guard.canActivate(contextFor(HandlerLevelController, ["buyer"])),
    ).toBe(false);
  });

  it("lets a route with no @Roles through", () => {
    expect(guard.canActivate(contextFor(UnguardedController, []))).toBe(true);
  });

  it("denies a request with no authenticated user rather than throwing", () => {
    const context = {
      getHandler: () => ClassLevelController.prototype.handler,
      getClass: () => ClassLevelController,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as never;
    expect(guard.canActivate(context)).toBe(false);
  });
});
