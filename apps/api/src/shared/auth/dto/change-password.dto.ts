import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

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
}
