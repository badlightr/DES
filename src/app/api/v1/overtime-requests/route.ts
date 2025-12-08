import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWithIdempotency } from "@/lib/idempotency";
import { verifyAccessToken } from "@/lib/jwt";
import crypto from "crypto";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const userPayload = token ? verifyAccessToken(token) : null;
  if (!userPayload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (userPayload as any).sub as string;

  const idempotencyKey = req.headers.get("x-idempotency-key");
  if (!idempotencyKey) return NextResponse.json({ error: "Missing Idempotency Key" }, { status: 400 });

  const body = await req.json();
  const { start_at, end_at, reason, departmentId } = body;

  const result = await runWithIdempotency(idempotencyKey, userId, "/api/v1/overtime-requests", async () => {
    const start = new Date(start_at);
    const end = new Date(end_at);
    if (end <= start) throw new Error("end must be after start");

    const durationMin = Math.floor((end.getTime() - start.getTime()) / 60000);

    return await prisma.$transaction(async (tx: any) => {
      // overlap check (transactional)
      const overlaps = await tx.$queryRawUnsafe(`
        SELECT id FROM "OvertimeRequest"
        WHERE "userId" = $1
          AND "is_active" = true
          AND "status" NOT IN ('REJECTED','CANCELED','EXPIRED')
          AND tstzrange("start_at","end_at",'[]') && tstzrange($2,$3,'[]')
        FOR UPDATE
      `, userId, start.toISOString(), end.toISOString());

      if ((overlaps as any[]).length > 0) {
        const e: any = new Error("Overlap with existing overtime request");
        e.code = "OVERLAP";
        throw e;
      }

      const created = await tx.overtimeRequest.create({
        data: {
          userId,
          departmentId,
          start_at: start,
          end_at: end,
          duration_min: durationMin,
          reason,
          status: "SUBMITTED",
          submitted_at: new Date(),
          created_by: userId
        }
      });

      await tx.auditEntry.create({
        data: {
          entity_table: "OvertimeRequest",
          entity_id: created.id,
          action: "insert",
          performed_by: userId,
          diff: {},
          sha256: crypto.createHash("sha256").update(JSON.stringify(created)).digest("hex")
        }
      });

      return created;
    });
  });

  if (result.duplicate) {
    return NextResponse.json(result.response);
  }
  return NextResponse.json(result.response, { status: 201 });
}
