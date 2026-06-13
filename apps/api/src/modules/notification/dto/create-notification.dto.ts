import { IsIn, IsOptional, IsString } from "class-validator";

export const NOTIFICATION_TYPES = [
  "PENDING_ORDER",
  "LOW_STOCK",
  "ORDER_APPROVED",
  "ORDER_REJECTED",
  "ORDER_RESUBMITTED",
  "ORDER_CANCELED",
  "ORDER_REPORT",
  "REPORT_READY",
  "REPORT_FAILED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export class CreateNotificationDto {
  @IsString()
  text: string;

  @IsString()
  to: string;

  @IsIn(NOTIFICATION_TYPES as unknown as string[])
  type: NotificationType;

  @IsOptional()
  @IsString()
  metadata?: string;
}
