import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SkipThrottle, Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { AuthUser, Role } from "@sgm/shared";
import { GetUserId } from "src/shared/decorators/get-user-id";
// biome-ignore lint/style/useImportType: <explanation>
import { AuthService } from "./auth.service";
import { ChangePasswordDto, SetPasswordDto } from "./dto/change-password.dto";

// Rate limiting is scoped to this controller rather than applied globally:
// the whole kitchen can share one NAT address, and a global cap would throttle
// ordinary traffic. Only the password-guessing routes need it.
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Identity for the browser: roles, departments, the ULID and the display
   * name. It replaces decoding claims client-side — not because the claims are
   * wrong, but because the department *names* and the display fields are not
   * in the token, and the browser would otherwise need a second call for them.
   *
   * SkipThrottle is load-bearing. The controller-level guard would otherwise
   * apply the 10/minute default here, and with the whole building behind one
   * NAT address that throttles real users. The symptom would be everyone's
   * menu going blank, which looks nothing like rate limiting.
   */
  @Get("me")
  @SkipThrottle()
  @UseGuards(AuthGuard("jwt"))
  me(@Request() req): Promise<AuthUser> {
    // Read straight off the request rather than through @GetDepartmentIds:
    // that decorator 403s a user with no department, which is right for the
    // endpoints that scope data by one and wrong here. This endpoint is what
    // the shell waits on, so failing it would black out the whole app instead
    // of showing an empty setor list.
    const { id, roles, departmentIds } = req.user as {
      id: string;
      roles: Role[];
      departmentIds: string[];
    };
    return this.authService.me(id, roles, departmentIds);
  }

  @Post("change-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard("jwt"))
  async changePassword(
    @GetUserId() userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { ok: true };
  }

  /**
   * First password after an invite or a recovery link. Throttled like
   * change-password: it is reachable with only a session, and a session is
   * what a leaked link hands out.
   *
   * Note for callers: Supabase revokes every session of the user when the
   * password is set through the admin API, this one included. The browser has
   * to sign out and sign back in afterwards.
   */
  @Post("set-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard("jwt"))
  async setPassword(@GetUserId() userId: string, @Body() dto: SetPasswordDto) {
    await this.authService.setPassword(userId, dto.newPassword);
    return { ok: true };
  }
}
