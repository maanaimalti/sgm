import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
// biome-ignore lint/style/useImportType: <explanation>
import { AuthService } from "src/shared/auth/auth.service";
import { ResetPasswordDto } from "src/shared/auth/dto/change-password.dto";
import { Roles } from "src/shared/auth/roles.decorator";
import { RolesGuard } from "src/shared/auth/roles.guard";
// biome-ignore lint/style/useImportType: <explanation>
import { UsersService } from "./users.service";

/**
 * Read-only directory plus admin password reset. Creating, editing and
 * deactivating users is deliberately not exposed yet — accounts are still
 * provisioned through `prisma/seed.ts`.
 */
@Controller("users")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("admin")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post(":id/reset-password")
  @HttpCode(200)
  async resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(id, dto.newPassword);
    return { ok: true };
  }
}
