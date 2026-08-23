import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";
import { notFound } from "@/lib/api/errors";
import type { ObjectStore, StoredObject } from "./types";

/**
 * Private local-disk store.
 *
 * Files live under STORAGE_DIR, which is deliberately OUTSIDE ./public — Next
 * never serves them statically. The only way out is /api/files/:id, which
 * checks the session and a short-lived signed token first.
 */
export class LocalObjectStore implements ObjectStore {
  private get root(): string {
    return path.resolve(process.cwd(), env.storageDir);
  }

  /** Rejects any key that would escape the storage root (`../` and friends). */
  private resolveKey(key: string): string {
    const full = path.resolve(this.root, key);
    const root = this.root;
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw new Error(`Refusing to access a path outside the storage root: ${key}`);
    }
    return full;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async put(key: string, body: Buffer, _contentType: string): Promise<StoredObject> {
    const full = this.resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    // 0o600: readable only by the process owner.
    await fs.writeFile(full, body, { mode: 0o600, flag: "wx" });
    return {
      key,
      size: body.byteLength,
      checksumSha256: createHash("sha256").update(body).digest("hex"),
    };
  }

  async get(key: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolveKey(key));
    } catch {
      throw notFound("The stored file is no longer available.");
    }
  }

  async remove(key: string): Promise<void> {
    await fs.rm(this.resolveKey(key), { force: true });
  }
}
