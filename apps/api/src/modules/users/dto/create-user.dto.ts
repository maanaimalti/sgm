import { ROLES, type Role } from "@sgm/shared";
import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

// bcrypt silently ignores anything past 72 bytes, and Supabase Auth hashes
// with bcrypt too, so the cap still applies.
const MAX_PASSWORD_LENGTH = 72;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9._-]{3,32}$/i, {
    message:
      "username deve ter de 3 a 32 caracteres, apenas letras, números, ponto, hífen ou underscore",
  })
  username: string;

  // Normalizing here is mandatory. The unique index on public.users is
  // case-sensitive while Supabase Auth lowercases internally, so without this
  // "Joao@x" could exist here and "joao@x" there, and nothing would ever match
  // the two up again.
  @Transform(({ value }) =>
    String(value ?? "")
      .trim()
      .toLowerCase(),
  )
  @IsEmail({}, { message: "e-mail inválido" })
  email: string;

  /**
   * Accepted and ignored. Users are created by invitation now and choose their
   * own password, but the web app keeps sending this field until its own
   * deploy lands — and the two apps deploy separately, so rejecting it here
   * would break the form in the window between them. Remove once the web
   * change is live.
   */
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(MAX_PASSWORD_LENGTH)
  password?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLES, { each: true })
  roles: Role[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  departmentIds: string[];
}
