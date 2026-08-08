import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read the controller as well as the handler: reading only the handler
    // makes a class-level @Roles silently pass everyone through.
    const roles = this.reflector.getAllAndOverride<string[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) {
      return true;
    }
    const userRoles: string[] =
      context.switchToHttp().getRequest().user?.roles ?? [];
    return roles.some((role) => userRoles.includes(role));
  }
}
