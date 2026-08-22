import { z } from "zod";

// Mirrors the API DTO: at least 6 characters, and bcrypt ignores past 72 bytes.
const password = z
  .string({ message: "Senha é obrigatória" })
  .min(6, { message: "A senha deve ter no mínimo 6 caracteres" })
  .max(72, { message: "A senha deve ter no máximo 72 caracteres" });

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ message: "Senha atual é obrigatória" })
      .min(1, { message: "Senha atual é obrigatória" }),
    newPassword: password,
    confirmPassword: z.string({ message: "Confirme a nova senha" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "A nova senha deve ser diferente da atual",
    path: ["newPassword"],
  });

export const resetPasswordSchema = z
  .object({
    newPassword: password,
    confirmPassword: z.string({ message: "Confirme a nova senha" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

/**
 * Same shape as resetPasswordSchema, kept separate because the two are read by
 * different people: an admin typing a password for someone else, and someone
 * choosing their own after an invite.
 */
export const setPasswordSchema = z
  .object({
    newPassword: password,
    confirmPassword: z.string({ message: "Confirme a nova senha" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type SetPasswordForm = z.infer<typeof setPasswordSchema>;
