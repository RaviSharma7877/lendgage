import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import mariadb from 'mariadb'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? (() => {
  const url = new URL(process.env.DATABASE_URL!)
  const pool = mariadb.createPool({
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  })
  const adapter = new PrismaMariaDb(pool)
  return new PrismaClient({ adapter })
})()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** Prisma duplicate-key detection, used to turn races into clean 409s. */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  )
}
