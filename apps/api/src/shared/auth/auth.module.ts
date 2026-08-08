import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { LocalStrategy } from "./local.strategy";

@Global()
@Module({
  controllers: [AuthController],
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) {
          throw new Error("JWT_SECRET environment variable is required");
        }
        const expiresIn = (config.get<string>("JWT_EXPIRES_IN") ??
          "12h") as JwtSignOptions["expiresIn"];
        return { secret, signOptions: { expiresIn } };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
