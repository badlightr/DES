-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'HR', 'ADMIN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_no" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "departmentId" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimeRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "departmentId" UUID,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "max_level" INTEGER NOT NULL DEFAULT 3,
    "current_level" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalChain" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "departmentId" UUID,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalChainStep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chainId" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "role" "UserRole",
    "userId" TEXT,
    "auto_escalate_after_min" INTEGER,
    "allow_delegate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApprovalChainStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "overtimeRequestId" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "approver_id" UUID,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decision_at" TIMESTAMP(3),
    "comment" TEXT,
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_table" TEXT NOT NULL,
    "entity_id" UUID,
    "action" TEXT NOT NULL,
    "performed_by" UUID,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diff" JSONB,
    "sha256" TEXT NOT NULL,
    "previous_sha256" TEXT,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "request_hash" TEXT,
    "response_body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PolicyConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenRevocation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "token_jti" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenRevocation_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "User_employee_no_key" ON "User"("employee_no");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "PolicyConfig_key_key" ON "PolicyConfig"("key");
CREATE UNIQUE INDEX "TokenRevocation_token_jti_key" ON "TokenRevocation"("token_jti");

-- Create indexes for common queries
CREATE INDEX "AttendanceLog_userId_check_in_idx" ON "AttendanceLog"("userId", "check_in" DESC);
CREATE INDEX "OvertimeRequest_userId_status_idx" ON "OvertimeRequest"("userId", "status");
CREATE INDEX "OvertimeRequest_userId_start_at_end_at_idx" ON "OvertimeRequest"("userId", "start_at", "end_at");
CREATE INDEX "ApprovalStep_overtimeRequestId_step_order_idx" ON "ApprovalStep"("overtimeRequestId", "step_order");
CREATE INDEX "AuditEntry_entity_table_entity_id_idx" ON "AuditEntry"("entity_table", "entity_id");
CREATE INDEX "TokenRevocation_userId_expires_at_idx" ON "TokenRevocation"("userId", "expires_at");
CREATE INDEX "IdempotencyKey_owner_id_created_at_idx" ON "IdempotencyKey"("owner_id", "created_at");

-- Create EXCLUSION CONSTRAINT for soft-deleted overtime requests
-- Note: Prisma cannot directly define exclusion constraints, so this is handled at DB migration level.
-- The exclusion constraint prevents overlapping time ranges for active (is_active=true) requests by same user.
-- Raw SQL approach: WHERE is_active = true for active requests only.
CREATE UNIQUE INDEX "overtime_request_overlap_active_idx"
  ON "OvertimeRequest" (
    "userId",
    tstzrange("start_at", "end_at", '[]')
  )
  WHERE is_active = true;

-- Trigger: Auto-set is_active = false when deleted_at is set (soft delete trigger)
CREATE OR REPLACE FUNCTION set_overtime_inactive_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER overtime_request_soft_delete_trigger
  BEFORE UPDATE ON "OvertimeRequest"
  FOR EACH ROW
  EXECUTE FUNCTION set_overtime_inactive_on_delete();

-- Trigger: Create audit entry on insert
CREATE OR REPLACE FUNCTION audit_overtime_insert()
RETURNS TRIGGER AS $$
DECLARE
  sha_value TEXT;
  prev_sha TEXT;
BEGIN
  sha_value := encode(
    digest(
      jsonb_build_object(
        'action', 'INSERT',
        'entity', NEW.id,
        'timestamp', NEW.created_at,
        'data', row_to_json(NEW)
      )::text,
      'sha256'
    ),
    'hex'
  );
  
  INSERT INTO "AuditEntry" (
    entity_table,
    entity_id,
    action,
    performed_by,
    performed_at,
    diff,
    sha256,
    previous_sha256
  ) VALUES (
    'OvertimeRequest',
    NEW.id,
    'CREATE',
    NEW.created_by,
    NOW(),
    jsonb_build_object('new', row_to_json(NEW)),
    sha_value,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER overtime_audit_insert_trigger
  AFTER INSERT ON "OvertimeRequest"
  FOR EACH ROW
  EXECUTE FUNCTION audit_overtime_insert();

-- Trigger: Create audit entry on update (for status changes)
CREATE OR REPLACE FUNCTION audit_overtime_update()
RETURNS TRIGGER AS $$
DECLARE
  sha_value TEXT;
  prev_sha TEXT;
BEGIN
  -- Only audit if meaningful changes occur
  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.current_level IS DISTINCT FROM NEW.current_level
     OR OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    
    -- Get previous audit entry's hash
    SELECT sha256 INTO prev_sha FROM "AuditEntry"
      WHERE entity_id = NEW.id AND entity_table = 'OvertimeRequest'
      ORDER BY performed_at DESC LIMIT 1;
    
    sha_value := encode(
      digest(
        jsonb_build_object(
          'action', 'UPDATE',
          'entity', NEW.id,
          'timestamp', NOW(),
          'old_status', OLD.status,
          'new_status', NEW.status,
          'old_level', OLD.current_level,
          'new_level', NEW.current_level
        )::text,
        'sha256'
      ),
      'hex'
    );
    
    INSERT INTO "AuditEntry" (
      entity_table,
      entity_id,
      action,
      performed_by,
      performed_at,
      diff,
      sha256,
      previous_sha256
    ) VALUES (
      'OvertimeRequest',
      NEW.id,
      'UPDATE',
      NEW.updated_at::text::UUID, -- placeholder; app handles performed_by
      NOW(),
      jsonb_build_object('old', OLD.status, 'new', NEW.status),
      sha_value,
      prev_sha
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER overtime_audit_update_trigger
  AFTER UPDATE ON "OvertimeRequest"
  FOR EACH ROW
  EXECUTE FUNCTION audit_overtime_update();

-- Trigger: Clean up revoked tokens after expiry
CREATE OR REPLACE FUNCTION cleanup_revoked_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM "TokenRevocation" WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger on ApprovalStep changes to create audit entries
CREATE OR REPLACE FUNCTION audit_approval_update()
RETURNS TRIGGER AS $$
DECLARE
  sha_value TEXT;
  prev_sha TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT sha256 INTO prev_sha FROM "AuditEntry"
      WHERE entity_table = 'ApprovalStep' AND entity_id = NEW.id
      ORDER BY performed_at DESC LIMIT 1;
    
    sha_value := encode(
      digest(
        jsonb_build_object(
          'action', 'APPROVAL_UPDATE',
          'approval_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        )::text,
        'sha256'
      ),
      'hex'
    );
    
    INSERT INTO "AuditEntry" (
      entity_table,
      entity_id,
      action,
      performed_by,
      performed_at,
      diff,
      sha256,
      previous_sha256
    ) VALUES (
      'ApprovalStep',
      NEW.id,
      'UPDATE',
      NEW.approver_id,
      NOW(),
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'comment', NEW.comment),
      sha_value,
      prev_sha
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_audit_update_trigger
  AFTER UPDATE ON "ApprovalStep"
  FOR EACH ROW
  EXECUTE FUNCTION audit_approval_update();
