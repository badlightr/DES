# Production-Grade Overtime Management System
## System Architecture & Implementation Guide

---

## 🏗️ ARCHITECTURE OVERVIEW

### Core Principles
1. **Zero Trust Authentication** - JWT with role-based access control
2. **Audit-First Design** - Every change logged with SHA256 hash chains
3. **Data Integrity** - Transactional operations, soft deletes, row versioning
4. **Business Rule Enforcement** - Calculated from actual data, not user input
5. **Scalability** - Database-first, stateless API, efficient queries

---

## 🔐 SECURITY ARCHITECTURE

### Authentication Flow
```
User Login
  ↓
Generate Access Token (15m) + Refresh Token (14d)
  ↓
Store Refresh Token in HttpOnly Cookie
  ↓
Return Access Token
  ↓
Use Access Token in Authorization: Bearer <token>
```

### Authorization Layers
```
1. Token Validation (verifyToken)
2. Role Hierarchy Check (requireRole)
3. Resource-Level Permission (ownsResource check)
4. Department-Level Access (departmentId match)
```

### Role Hierarchy
```
ADMIN
  ↓
HR → MANAGER → SUPERVISOR → EMPLOYEE
```

Admin can see all. HR can see HR tasks. Manager sees team. Supervisor sees supervised employees. Employee sees own.

### CORS Policy
```
Allowed Origins: Configured via CORS_ORIGIN env
Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Headers: Content-Type, Authorization, X-Idempotency-Key
Credentials: true (for cookies)
```

### Security Headers Enforced
- `X-Content-Type-Options: nosniff` - Prevent MIME type sniffing
- `X-Frame-Options: DENY` - Clickjacking protection
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Strict-Transport-Security` - HTTPS enforcement
- `Content-Security-Policy` - Script injection prevention
- `Referrer-Policy` - Leak prevention
- `Permissions-Policy` - Feature access control

---

## 💼 BUSINESS LOGIC ARCHITECTURE

### Overtime Request Lifecycle
```
DRAFT (local form)
  ↓ (user submits)
SUBMITTED (sent to approvers)
  ↓ (approval pending)
PENDING (in approval chain)
  ↓ (all approved)
APPROVED (record accepted)

OR at any step:
  ↓ (rejected by approver)
REJECTED

OR if deadline passes:
  ↓
EXPIRED

OR user withdraws:
  ↓
CANCELED
```

### Multi-Level Approval Chain
Each department has configurable approval chain:
```
Department Config:
  ├─ Step 1: Supervisor
  ├─ Step 2: Manager
  └─ Step 3: HR

When request submitted:
  1. Create OvertimeRequest (status=SUBMITTED)
  2. Create ApprovalStep records (status=PENDING for each step)
  3. First approver gets notification
  4. When approves → next approver's turn
  5. Last approves → status=APPROVED
  6. Any rejects → status=REJECTED
```

### Overtime Validation Rules

#### Rule 1: Attendance Verification
- **CRITICAL**: Overtime duration must match actual attendance logs
- User input (form) is metadata only
- Calculated from check_in/check_out timestamps
- User cannot claim hours they didn't work

#### Rule 2: No Overlaps
- Check for overlapping requests in same user/time range
- Transactional lock (FOR UPDATE) prevents race conditions
- Status check: ignore REJECTED, CANCELED, EXPIRED

#### Rule 3: Daily Limit
- Default: 4 hours/day
- Configurable via PolicyConfig table
- Enforced at submission time

#### Rule 4: Weekly Limit
- Default: 12 hours/week
- Week = Sunday-Saturday
- Accumulated across all PENDING/APPROVED requests
- Enforced at submission time

#### Rule 5: Submission Deadline
- Default: 3 days after work date
- Must submit within X days or request expires
- Prevents stale submissions

#### Rule 6: Multipliers
- **Night Shift** (22:00 - 06:00): 1.5x multiplier
- **Holiday**: 2.0x multiplier (takes precedence)
- Applied to payment calculation, not duration validation
- Lookup from PolicyConfig table

---

## 📊 DATA INTEGRITY MECHANISMS

### Soft Deletes
All user-data tables have `deleted_at` timestamp:
```
is_active = true (normal)
is_active = false, deleted_at = timestamp (soft deleted)

Queries always filter: WHERE is_active = true
```

### Row Versioning
Each OvertimeRequest has `row_version`:
```
row_version=1 (created)
row_version=2 (first update)
row_version=3 (approval)

Prevents:
- Concurrent update conflicts
- Lost update problem
- Audit trail gaps
```

### Audit Trail (SHA256 Hash Chain)
```
AuditEntry {
  entity_table: "OvertimeRequest"
  entity_id: "req-123"
  action: "INSERT"
  performed_by: "user-456"
  diff: { created request data }
  sha256: hash(current_state)
  previous_sha256: hash(previous_state)
}

Hash chain proves:
- No entries deleted/modified
- Exact sequence of changes
- Who changed what when
```

### Idempotency Keys
Prevents duplicate submissions:
```
IdempotencyKey {
  key: "uuid-from-client"
  owner_id: "user-id"
  method: "POST"
  path: "/api/v1/overtime-requests"
  response_body: { cached result }
  used_at: timestamp
}

Behavior:
1. Client sends X-Idempotency-Key header
2. Server checks IdempotencyKey table
3. If exists and used_at is set → return cached response
4. If not exists → process & cache result
5. Timeout: IDEMPOTENCY_TTL (default 24h)
```

---

## 🔌 API ENDPOINTS

### Authentication
```
POST /api/v1/auth/login
  Body: { email, password }
  Returns: { accessToken, refreshToken }

POST /api/v1/auth/refresh
  Body: { refreshToken }
  Returns: { accessToken }

POST /api/v1/auth/logout
  Returns: { success: true }
```

### Overtime Requests
```
GET /api/v1/overtime-requests
  Query: ?page=1&pageSize=10&status=PENDING&userId=X&departmentId=Y
  Auth: Required
  Returns: { items, pagination }

POST /api/v1/overtime-requests
  Body: { start_at, end_at, reason, departmentId }
  Headers: X-Idempotency-Key
  Auth: EMPLOYEE+
  Returns: { overtimeRequest }

GET /api/v1/overtime-requests/:id
  Auth: Required
  Returns: { overtimeRequest with approvals }

POST /api/v1/overtime-requests/:id/approve
  Body: { status: APPROVED|REJECTED, comment? }
  Auth: SUPERVISOR+
  Returns: { updated overtimeRequest }

PATCH /api/v1/overtime-requests/:id
  Body: { reason?, departmentId? }
  Auth: EMPLOYEE (if DRAFT), ADMIN
  Returns: { updated overtimeRequest }

DELETE /api/v1/overtime-requests/:id
  Auth: EMPLOYEE (if DRAFT), ADMIN
  Returns: { success: true }
```

### Approval Chain Configuration (Admin)
```
POST /api/v1/approval-chains
  Body: { departmentId, name, steps: [{order, role/userId}] }
  Auth: ADMIN
  Returns: { approvalChain }

GET /api/v1/approval-chains/:departmentId
  Auth: HR+
  Returns: { approvalChain with steps }

PUT /api/v1/approval-chains/:id
  Body: { steps updated }
  Auth: ADMIN
  Returns: { updated approvalChain }
```

### Policy Configuration (Admin)
```
GET /api/v1/policies
  Auth: ADMIN
  Returns: { policies: [...] }

PUT /api/v1/policies/:key
  Body: { value: {...} }
  Auth: ADMIN
  Returns: { policy }

Supported Keys:
  - max_overtime_day_min (minutes)
  - max_overtime_week_min (minutes)
  - night_multiplier (decimal)
  - holiday_multiplier (decimal)
  - submission_deadline_days (int)
```

### Attendance Logs (Integration Point)
```
GET /api/v1/attendance-logs/:userId
  Query: ?startDate=&endDate=
  Auth: EMPLOYEE (self) or HR+
  Returns: { logs: [...] }

POST /api/v1/attendance-logs (Mock)
  Body: { userId, check_in, check_out, source }
  Auth: ADMIN
  Returns: { log }
```

---

## 🗄️ DATABASE SCHEMA

### Core Tables
```sql
Users
├─ id (UUID)
├─ employee_no (String, unique)
├─ email (String, unique)
├─ role (Enum: EMPLOYEE, SUPERVISOR, MANAGER, HR, ADMIN)
├─ departmentId (FK → Department)
├─ is_active (Boolean)
├─ timezone (String)
└─ Soft delete: deleted_at, created_at, updated_at

OvertimeRequest
├─ id (UUID)
├─ userId (FK → User)
├─ departmentId (FK → Department)
├─ status (Enum: DRAFT, SUBMITTED, PENDING, APPROVED, REJECTED, EXPIRED, CANCELED)
├─ start_at, end_at (DateTime)
├─ duration_min (Int)
├─ reason (String?)
├─ submitted_at, expires_at (DateTime?)
├─ current_level (Int - tracks approval step)
├─ row_version (Int - concurrency control)
├─ created_by (FK → User)
├─ is_active (Boolean)
└─ Soft delete: deleted_at, updated_at

ApprovalStep
├─ id (UUID)
├─ overtimeRequestId (FK → OvertimeRequest, CASCADE)
├─ step_order (Int)
├─ approver_id (FK → User?)
├─ status (Enum: PENDING, APPROVED, REJECTED, SKIPPED)
├─ decision_at, comment (DateTime?, String?)
├─ row_version (Int)
└─ created_at

ApprovalChain
├─ id (UUID)
├─ departmentId (FK → Department?)
├─ name (String)
└─ created_at

ApprovalChainStep
├─ id (UUID)
├─ chainId (FK → ApprovalChain, CASCADE)
├─ step_order (Int)
├─ role (Enum?) - Can check role OR fixed userId
├─ userId (String?) - Fixed approver
├─ auto_escalate_after_min (Int?)
└─ allow_delegate (Boolean)

AttendanceLog
├─ id (UUID)
├─ userId (FK → User, CASCADE)
├─ check_in, check_out (DateTime, DateTime?)
├─ source (String: device/manual/api)
├─ verified (Boolean - must be true for overtime calc)
├─ metadata (JSON)
└─ created_at

AuditEntry
├─ id (UUID)
├─ entity_table (String)
├─ entity_id (UUID?)
├─ action (String: INSERT, UPDATE, DELETE, APPROVE)
├─ performed_by (FK → User?)
├─ performed_at (DateTime)
├─ diff (JSON)
├─ sha256 (String - hash of current state)
└─ previous_sha256 (String? - hash chain)

IdempotencyKey
├─ key (String, PK)
├─ owner_id (FK → User)
├─ method (String)
├─ path (String)
├─ request_hash (String?)
├─ response_body (JSON)
├─ created_at, used_at (DateTime, DateTime?)
└─ TTL: 24 hours

PolicyConfig
├─ id (UUID)
├─ key (String, unique)
├─ value (JSON)
├─ effective_from (DateTime)
└─ created_at
```

---

## 🚀 PRODUCTION DEPLOYMENT CHECKLIST

### Before Going Live
- [ ] Set strong JWT_SECRET (min 32 chars)
- [ ] Configure CORS_ORIGIN to actual domain
- [ ] Setup PostgreSQL with SSL
- [ ] Enable row-level security (RLS) in Postgres
- [ ] Setup automated backups
- [ ] Configure logging/monitoring (structured JSON logs)
- [ ] Setup alerting for approval queue delays
- [ ] Load test with concurrent submissions
- [ ] Run audit trail validation tests
- [ ] Document approval chain for each department
- [ ] Train HR on policy configuration
- [ ] Setup email notifications (off MVP but framework ready)
- [ ] Configure holiday calendar

### Monitoring & Alerts
```
Critical Alerts:
- Auth failures spike
- Database deadlocks
- Submission validation failures
- Approval queue stalled (>2h pending)
- Audit trail gaps
- Idempotency cache misses (indicates clock skew)
```

### Performance Optimizations (Phase 2)
```
- Index: (userId, status, created_at) on OvertimeRequest
- Index: (departmentId) on ApprovalChain
- Cache: PolicyConfig (5min TTL)
- Cache: Approval chains (per department)
- Pagination: max 100 items/page
- Rate limit: 100 requests/hour per user
```

---

## 📋 TESTING STRATEGY

### Unit Tests
- Validation functions (date ranges, amounts)
- Multiplier calculations
- Role hierarchy checks

### Integration Tests
```
1. Submission → Validation → Approval Chain Creation
2. Approval flow: Step 1 → Step 2 → Step 3 → Approved
3. Rejection at Step 2 → Status changes to Rejected
4. Idempotency: Same key = cached response
5. Overlap detection: Transaction lock works
6. Audit trail: All changes logged with hash chain
7. Soft delete: Requests visible only if is_active=true
```

### Performance Tests
- 1000 concurrent submissions
- 100 simultaneous approvals
- Query latency < 200ms (p95)

### Security Tests
- SQL injection attempts (parameterized queries protect)
- JWT tampering (verification fails)
- CORS violation (origin check)
- Missing idempotency key (rejected)
- Privilege escalation (role check fails)

---

## 🔄 NEXT PHASES

### Phase 2: Enhanced Features
- Email notifications (Resend/SendGrid)
- Approval escalation (auto-escalate after N hours)
- Delegation (approver assigns to someone else)
- Mobile app support
- Real attendance integration (API from time-tracking system)

### Phase 3: Analytics
- Overtime trends per department
- Approval SLA metrics
- Cost analysis (overtime spend vs policy)
- Compliance reports

### Phase 4: AI Features
- Predict overtime needs
- Anomaly detection (unusual patterns)
- Recommendation engine (suggest process improvements)

---

## 📞 SUPPORT & RUNBOOKS

### Common Issues
```
Q: User can't submit overtime
A: Check:
  1. Role is EMPLOYEE or SUPERVISOR
  2. No overlapping requests
  3. Within submission deadline (3 days)
  4. Daily/weekly limits not exceeded
  5. Attendance logs exist (check verified=true)

Q: Approval chain not working
A: Check:
  1. ApprovalChain exists for user's department
  2. ApprovalChainSteps have step_order set correctly
  3. Approver users have correct role
  4. Approvers exist in User table

Q: Audit trail shows gaps
A: Check:
  1. sha256 hash chain is unbroken
  2. No manual database edits (use API)
  3. Timestamp ordering is correct
  4. All operations were transactional
```

---

**Last Updated**: December 8, 2025
**Version**: 1.0.0-production
**Status**: Ready for MVP deployment
