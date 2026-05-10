import "dotenv/config";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { PrismaExceptionFilter } from "./shared/filters/prisma-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableShutdownHooks();
  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "departmentId"],
  });
  await app.listen(port);
}
bootstrap();
