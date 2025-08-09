export class CreateNotificationDto {
  text: string;
  to: string;
  type: string;
  metadata?: string;
}
