import { prisma } from "./prisma";

export async function runWithIdempotency(key: string, ownerId: string, path: string, fn: ()=>Promise<any>) {
  const existing = await prisma.idempotencyKey.findUnique({ where: { key }});
  if (existing) {
    return { duplicate: true, response: existing.response_body };
  }

  await prisma.idempotencyKey.create({
    data: { key, owner_id: ownerId, method: "POST", path }
  });

  const result = await fn();

  await prisma.idempotencyKey.update({ where: { key }, data: { response_body: result, used_at: new Date() }});
  return { duplicate: false, response: result };
}
