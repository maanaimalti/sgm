import {
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

function authorizedDepartmentIds(ctx: ExecutionContext): string[] {
  return ctx.switchToHttp().getRequest().user?.departmentIds ?? [];
}

/**
 * The department the caller is acting on, taken from the authenticated user.
 *
 * A `departmentId` request header is still honoured so a user who belongs to
 * more than one department can pick one, but only after checking it against the
 * departments on their token — the header alone is not trusted.
 */
export const GetDepartmentId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const allowed = authorizedDepartmentIds(ctx);
    const header = ctx.switchToHttp().getRequest().headers?.departmentid;
    const requested = Array.isArray(header) ? header[0] : header;

    if (requested) {
      if (!allowed.includes(requested)) {
        throw new ForbiddenException(
          "You do not have access to this department",
        );
      }
      return requested;
    }

    if (allowed.length === 0) {
      throw new ForbiddenException("User has no department assigned");
    }
    return allowed[0];
  },
);

/** Every department the caller belongs to, for validating a department in a body. */
export const GetDepartmentIds = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string[] => {
    const allowed = authorizedDepartmentIds(ctx);
    if (allowed.length === 0) {
      throw new ForbiddenException("User has no department assigned");
    }
    return allowed;
  },
);
