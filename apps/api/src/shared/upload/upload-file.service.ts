import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UploadFileService {
  #client: S3Client;
  endpoint: string;

  constructor() {
    this.endpoint = process.env.R2_ENDPOINT;
    this.#client = new S3Client({
      endpoint: this.endpoint,
    });
  }

  async uploadFile(filename: string, file: Uint8Array) {
    const command = new PutObjectCommand({
      Bucket: "sgm",
      Key: filename,
      Body: file,
    });
    await this.#client.send(command);
  }

  async deleteFile(bucketName: string, filename: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: filename,
    });
    await this.#client.send(command);
  }

  getFileUrl(fileKey: string): string {
    const endpoint = "https://pub-02162cc0773546efb6b651c10eb87288.r2.dev/";
    return `${endpoint}${fileKey}`;
  }
}
