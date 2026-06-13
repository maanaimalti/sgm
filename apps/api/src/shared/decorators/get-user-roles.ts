import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export const GetUserRoles = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.roles ?? [];
  },
);
