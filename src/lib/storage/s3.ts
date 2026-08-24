import { createHash } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { env } from "@/lib/env";
import { notFound } from "@/lib/api/errors";
import type { ObjectStore, StoredObject } from "./types";

/**
 * S3 object store.
 *
 * Files live in an S3 bucket instead of the local disk.
 * Keys are already namespaced per user.
 */
export class S3ObjectStore implements ObjectStore {
  private client: S3Client;

  constructor() {
    const s3Region = env.s3Region;
    const bucketName = env.s3BucketName;

    if (!s3Region || !bucketName) {
      throw new Error("S3ObjectStore requires S3_REGION and S3_BUCKET_NAME to be set");
    }

    const credentials = 
      env.awsAccessKeyId && env.awsSecretAccessKey
        ? {
            accessKeyId: env.awsAccessKeyId,
            secretAccessKey: env.awsSecretAccessKey,
          }
        : undefined;

    this.client = new S3Client({
      region: s3Region,
      ...(credentials ? { credentials } : {}),
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    const checksumSha256 = createHash("sha256").update(body).digest("hex");

    await this.client.send(
      new PutObjectCommand({
        Bucket: env.s3BucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Optional: you can provide the checksum to S3
        // ChecksumSHA256: checksumSha256,
      })
    );

    return {
      key,
      size: body.byteLength,
      checksumSha256,
    };
  }

  async get(key: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: env.s3BucketName,
          Key: key,
        })
      );

      if (!response.Body) {
        throw notFound("The stored file is no longer available.");
      }

      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error: unknown) {
      // AWS SDK throws NoSuchKey if the object doesn't exist
      if (error instanceof Error && error.name === "NoSuchKey") {
        throw notFound("The stored file is no longer available.");
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: env.s3BucketName,
        Key: key,
      })
    );
  }
}
