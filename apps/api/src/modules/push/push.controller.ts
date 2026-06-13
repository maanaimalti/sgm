import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { GetUserId } from "src/shared/decorators/get-user-id";
import {
  SaveSubscriptionDto,
  UnsubscribeDto,
} from "./dto/save-subscription.dto";
import { PushService } from "./push.service";

@Controller("push")
@UseGuards(AuthGuard("jwt"))
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get("public-key")
  publicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post("subscribe")
  @HttpCode(200)
  async subscribe(
    @GetUserId() userId: string,
    @Body() dto: SaveSubscriptionDto,
    @Headers("user-agent") userAgent?: string,
  ) {
    await this.pushService.saveSubscription(userId, dto, userAgent);
    return { ok: true };
  }

  @Post("unsubscribe")
  @HttpCode(200)
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    await this.pushService.removeSubscription(dto.endpoint);
    return { ok: true };
  }
}
