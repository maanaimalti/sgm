import { Global, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Global()
@Module({
  controllers: [AuthController],
  imports: [PassportModule],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
