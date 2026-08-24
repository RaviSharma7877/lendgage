/**
 * Centralised, fail-fast environment access.
 * Nothing in the app reads process.env directly, so a missing variable
 * surfaces as one clear error instead of an undefined-shaped bug later on.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get jwtSecret() {
    const secret = required("JWT_SECRET");
    if (secret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters long.");
    }
    return secret;
  },
  get storageDir() {
    return optional("STORAGE_DIR", "./storage/uploads");
  },
  get sessionTtlSeconds() {
    return Number(optional("SESSION_TTL_SECONDS", String(60 * 60 * 24 * 7)));
  },
  get maxUploadBytes() {
    return Number(optional("MAX_UPLOAD_BYTES", String(5 * 1024 * 1024)));
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get s3BucketName() {
    return optional("S3_BUCKET_NAME", "");
  },
  get s3Region() {
    return optional("S3_REGION", "");
  },
  get awsAccessKeyId() {
    return optional("APP_AWS_ACCESS_KEY_ID", "");
  },
  get awsSecretAccessKey() {
    return optional("APP_AWS_SECRET_ACCESS_KEY", "");
  },
  get isS3Configured() {
    return this.s3BucketName !== "" && this.s3Region !== "";
  },
};

export const SESSION_COOKIE = "pcp_session";
