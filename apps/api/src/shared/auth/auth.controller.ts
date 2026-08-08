import {
  Body,
  Controller,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { GetUserId } from "src/shared/decorators/get-user-id";
// biome-ignore lint/style/useImportType: <explanation>
import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { LocalAuthGuard } from "./local-auth.guard";

// Rate limiting is scoped to this controller rather than applied globally:
// the whole kitchen can share one NAT address, and a global cap would throttle
// ordinary traffic. Only the password-guessing routes need it.
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  async login(@Request() req, @Body() _credentials: LoginDto) {
    return this.authService.login(req.user);
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
