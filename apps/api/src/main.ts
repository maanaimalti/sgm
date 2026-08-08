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
  // Behind EasyPanel's proxy every request otherwise carries the proxy's IP,
  // which would make the login rate limit a single shared bucket.
  app.set("trust proxy", 1);
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
  // Development convenience only: unlike the r2 driver's signed URLs, this
  // serves the whole upload directory unauthenticated. Do not use in production.
  if (localMount) {
    await mkdir(localMount.dir, { recursive: true });
    app.useStaticAssets(localMount.dir, { prefix: localMount.prefix });
  }

  await app.listen(port);
}
bootstrap();
