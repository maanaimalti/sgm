import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";

type StorageDriver = "r2" | "local";

@Injectable()
export class UploadFileService {
  private readonly logger = new Logger(UploadFileService.name);
  private readonly driver: StorageDriver;

  // R2 driver state
  #r2Client?: S3Client;
  #r2Bucket = "sgm";

  // Local driver state
  #localDir!: string;
  #localPublicUrl!: string;

  constructor() {
    this.driver =
      (process.env.STORAGE_DRIVER?.toLowerCase() as StorageDriver) ?? "r2";

    if (this.driver === "local") {
      this.#localDir = resolve(
        process.env.LOCAL_STORAGE_DIR ?? join(process.cwd(), "uploads"),
      );
      this.#localPublicUrl =
        process.env.LOCAL_STORAGE_PUBLIC_URL ??
        `http://localhost:${process.env.PORT ?? 3333}/uploads`;
      this.logger.log(
        `Storage driver: local (dir=${this.#localDir}, publicUrl=${this.#localPublicUrl})`,
      );
    } else {
      this.#r2Client = new S3Client({ endpoint: process.env.R2_ENDPOINT });
      this.logger.log("Storage driver: r2");
    }
  }

  async uploadFile(
    filename: string,
    file: Uint8Array,
    contentType?: string,
  ): Promise<void> {
    if (this.driver === "local") {
      const fullPath = join(this.#localDir, filename);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, file);
      return;
    }
    // Copy into an exact-length Buffer so the S3 client never serializes a
    // view over a larger underlying ArrayBuffer (which would corrupt the file).
    const body = Buffer.from(file);
    const command = new PutObjectCommand({
      Bucket: this.#r2Bucket,
      Key: filename,
      Body: body,
      ContentType: contentType ?? guessContentType(filename),
      ContentLength: body.byteLength,
    });
    // biome-ignore lint/style/noNonNullAssertion: client is set when driver is r2
    await this.#r2Client!.send(command);
  }

  async deleteFile(bucketName: string, filename: string): Promise<void> {
    if (this.driver === "local") {
      const fullPath = join(this.#localDir, filename);
      await rm(fullPath, { force: true });
      return;
    }
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: filename,
    });
    // biome-ignore lint/style/noNonNullAssertion: client is set when driver is r2
    await this.#r2Client!.send(command);
  }

  getFileUrl(fileKey: string): string {
    if (this.driver === "local") {
      const base = this.#localPublicUrl.endsWith("/")
        ? this.#localPublicUrl
        : `${this.#localPublicUrl}/`;
      return `${base}${fileKey}`;
    }
    const endpoint =
      process.env.R2_PUBLIC_URL ??
      "https://pub-02162cc0773546efb6b651c10eb87288.r2.dev/";
    const normalized = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;
    return `${normalized}${fileKey}`;
  }

  /** Exposed so the bootstrap can mount static-file serving when in local mode. */
  getLocalStorageMount(): { dir: string; prefix: string } | null {
    if (this.driver !== "local") return null;
    return { dir: this.#localDir, prefix: "/uploads" };
  }
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function guessContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
}
