import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest DI requires the runtime class.
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: Nest DI requires the runtime class.
import { HelpersService } from "src/shared/helpers/helpers.service";
import * as webpush from "web-push";
import type { SaveSubscriptionDto } from "./dto/save-subscription.dto";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  type?: string;
};

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;
  private publicKey: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly helpersService: HelpersService,
  ) {}

  onModuleInit(): void {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:contato@maanaim.app";
    if (!publicKey || !privateKey) {
      this.logger.warn(
        "VAPID keys not configured (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY) — web push disabled.",
      );
      return;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.publicKey = publicKey;
    this.enabled = true;
    this.logger.log("Web push enabled.");
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  async saveSubscription(
    userId: string,
    dto: SaveSubscriptionDto,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        id: this.helpersService.generateId(),
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
    });
  }

  async removeSubscription(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  /**
   * Best-effort delivery to every device the user has subscribed. Expired
   * subscriptions (404/410) are pruned. Never throws — push is supplementary
   * to the in-app notification that is always persisted.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.enabled) return;
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subs.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => undefined);
            this.logger.log(`Pruned expired push subscription ${sub.id}`);
          } else {
            this.logger.warn(
              `Push delivery failed (${statusCode ?? "?"}): ${
                (error as Error)?.message
              }`,
            );
          }
        }
      }),
    );
  }
}
