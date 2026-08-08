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
import type { AuthUser } from "@sgm/shared";
import { GetUserId } from "src/shared/decorators/get-user-id";
// biome-ignore lint/style/useImportType: <explanation>
import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";

// Rate limiting is scoped to this controller rather than applied globally:
// the whole kitchen can share one NAT address, and a global cap would throttle
// ordinary traffic. Only the password-guessing routes need it.
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Identity for the browser: roles, departments, the ULID and the display
   * name. It replaces decoding claims client-side, which means a role change
   * takes effect on the next fetch rather than on the next token refresh.
   *
   * Costs nothing extra — JwtStrategy.validate already loaded this row to
   * authorize the request, so this is a projection of what is on the request.
   *
   * SkipThrottle is load-bearing. The controller-level guard would otherwise
   * apply the 10/minute default here, and with the whole building behind one
   * NAT address that throttles real users. The symptom would be everyone's
   * menu going blank, which looks nothing like rate limiting.
   */
  @Get("me")
  @SkipThrottle()
  @UseGuards(AuthGuard("jwt"))
  me(@Request() req): AuthUser {
    return req.user;
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
}
