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
  MaxLength,
} from "class-validator";

/**
 * Deliberately not PartialType(CreateUserDto). That would make `email`,
 * `username` and `password` patchable through a route that has no compensation
 * logic for any of them — changing an e-mail has to touch Supabase Auth too,
 * which is what PATCH /users/:id/email is for.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLES, { each: true })
  roles?: Role[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  departmentIds?: string[];
}

export class UpdateUserEmailDto {
  @Transform(({ value }) =>
    String(value ?? "")
      .trim()
      .toLowerCase(),
  )
  @IsEmail({}, { message: "e-mail inválido" })
  email: string;
}
