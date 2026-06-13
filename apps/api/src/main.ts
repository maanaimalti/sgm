import "dotenv/config";

import { mkdir } from "node:fs/promises";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { PrismaExceptionFilter } from "./shared/filters/prisma-exception.filter";
import { UploadFileService } from "./shared/upload/upload-file.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT || 3000;
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableShutdownHooks();
  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "departmentId"],
  });

  const uploadService = app.get(UploadFileService);
  const localMount = uploadService.getLocalStorageMount();
  if (localMount) {
    await mkdir(localMount.dir, { recursive: true });
    app.useStaticAssets(localMount.dir, { prefix: localMount.prefix });
  }

  await app.listen(port);
}
bootstrap();
