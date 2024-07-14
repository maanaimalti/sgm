import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';

@Global()
@Module({
  controllers: [AuthController],
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
    }),
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
