import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ResetPasswordDto } from "src/shared/auth/dto/change-password.dto";
import { Roles } from "src/shared/auth/roles.decorator";
import { RolesGuard } from "src/shared/auth/roles.guard";
import { GetUserId } from "src/shared/decorators/get-user-id";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto, UpdateUserEmailDto } from "./dto/update-user.dto";
// biome-ignore lint/style/useImportType: <explanation>
import { UsersService } from "./users.service";

/**
 * Admin-only user administration. Creating a user here is the only supported
 * way to add one: it has to land in Supabase Auth and in public.users
 * together, which raw SQL cannot do.
 */
@Controller("users")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("admin")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @GetUserId() callerId: string,
  ) {
    return this.usersService.update(id, dto, callerId);
  }

  /** How a placeholder address becomes the one the person actually signs in with. */
  @Patch(":id/email")
  updateEmail(@Param("id") id: string, @Body() dto: UpdateUserEmailDto) {
    return this.usersService.updateEmail(id, dto.email);
  }

  @Post(":id/reset-password")
  @HttpCode(200)
  async resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto) {
    await this.usersService.resetPassword(id, dto.newPassword);
    return { ok: true };
  }
}
