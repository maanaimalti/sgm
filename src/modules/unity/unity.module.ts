import { Module } from '@nestjs/common';
import { UnityService } from './unity.service';
import { UnityController } from './unity.controller';

@Module({
  controllers: [UnityController],
  providers: [UnityService],
})
export class UnityModule {}
