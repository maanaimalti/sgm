import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

// bcrypt silently ignores anything past 72 bytes, so cap it rather than let a
// longer password appear to be accepted in full.
const MAX_PASSWORD_LENGTH = 72;

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  @MaxLength(MAX_PASSWORD_LENGTH)
  newPassword: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(MAX_PASSWORD_LENGTH)
  newPassword: string;

  /**
   * Defaults to true in the service. A password the admin typed and then read
   * out loud is a shared secret, so the person is asked to replace it on their
   * next sign-in; `false` is for the break-glass case where no mail can be
   * delivered and that extra hop would strand them.
   */
  @IsOptional()
  @IsBoolean()
  requirePasswordChange?: boolean;
}

/**
 * Separate from ChangePasswordDto on purpose — see AuthService.setPassword.
 * An invited account has no current password to send.
 */
export class SetPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(MAX_PASSWORD_LENGTH)
  newPassword: string;
}
