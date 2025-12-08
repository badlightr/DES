# Overtime System - API Quick Reference

## 🚀 Quick Start

### 1. Setup Local Environment
```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Setup database (see SETUP_DB.md)
npm run db:migrate
npm run db:seed

# Start development server
npm run dev

# Server running at http://localhost:3000
```

---

## 🔐 Authentication

### Get Access Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Use Token in Requests
```bash
# Add to Authorization header
Authorization: Bearer eyJhbGc...
```

### Token Rotation (When Access Expires)
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGc..."}'
```

---

## 📋 Overtime Requests

### List All Overtime Requests (with Pagination)
```bash
curl http://localhost:3000/api/v1/overtime-requests \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"

# With filters:
curl "http://localhost:3000/api/v1/overtime-requests?page=1&pageSize=10&status=PENDING" \
  -H "Authorization: Bearer TOKEN"

# Query Parameters:
# - page: 1 (default)
# - pageSize: 10 (default, max 100)
# - status: DRAFT|SUBMITTED|PENDING|APPROVED|REJECTED|EXPIRED|CANCELED
# - userId: filter by user (HR+ only)
# - departmentId: filter by department (HR+ only)
```

### Create Overtime Request
```bash
curl -X POST http://localhost:3000/api/v1/overtime-requests \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "start_at": "2025-12-15T18:00:00Z",
    "end_at": "2025-12-15T21:00:00Z",
    "reason": "Critical project deadline",
    "departmentId": "dept-uuid-here"
  }'

# IMPORTANT:
# 1. X-Idempotency-Key is REQUIRED (prevents duplicates)
# 2. Dates must be ISO 8601 format
# 3. Must have attendance logs for this period
# 4. Must not overlap with existing requests
# 5. Must be within submission deadline (3 days default)
```

**Response:**
```json
{
  "success": true,
  "status": 201,
  "message": "Overtime request created",
  "data": {
    "id": "req-123456",
    "userId": "user-789",
    "status": "SUBMITTED",
    "start_at": "2025-12-15T18:00:00Z",
    "end_at": "2025-12-15T21:00:00Z",
    "duration_min": 180,
    "reason": "Critical project deadline",
    "submitted_at": "2025-12-08T10:30:00Z",
    "current_level": 0,
    "created_at": "2025-12-08T10:30:00Z"
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

### Get Single Request
```bash
curl http://localhost:3000/api/v1/overtime-requests/req-123456 \
  -H "Authorization: Bearer TOKEN"
```

### Approve/Reject Request (Supervisors+)
```bash
curl -X POST http://localhost:3000/api/v1/overtime-requests/req-123456/approve \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "comment": "Approved for critical project"
  }'

# Status: APPROVED or REJECTED
# Comment: optional
```

### Edit Request (Only if DRAFT or ADMIN)
```bash
curl -X PATCH http://localhost:3000/api/v1/overtime-requests/req-123456 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Updated reason",
    "departmentId": "dept-new-uuid"
  }'
```

### Cancel Request (Only if DRAFT or ADMIN)
```bash
curl -X DELETE http://localhost:3000/api/v1/overtime-requests/req-123456 \
  -H "Authorization: Bearer TOKEN"
```

---

## 👥 Approval Chain Management (Admin)

### Get Department's Approval Chain
```bash
curl http://localhost:3000/api/v1/approval-chains/dept-uuid \
  -H "Authorization: Bearer TOKEN"

# Response:
{
  "id": "chain-123",
  "departmentId": "dept-uuid",
  "name": "Engineering Approval Chain",
  "steps": [
    {
      "step_order": 1,
      "role": "SUPERVISOR",
      "userId": null,
      "auto_escalate_after_min": 1440
    },
    {
      "step_order": 2,
      "role": "MANAGER",
      "userId": null,
      "auto_escalate_after_min": 2880
    },
    {
      "step_order": 3,
      "role": "HR",
      "userId": null,
      "auto_escalate_after_min": null
    }
  ]
}
```

### Create/Update Approval Chain
```bash
curl -X POST http://localhost:3000/api/v1/approval-chains \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "dept-uuid",
    "name": "Engineering Approvals",
    "steps": [
      {
        "step_order": 1,
        "role": "SUPERVISOR",
        "auto_escalate_after_min": 1440
      },
      {
        "step_order": 2,
        "role": "MANAGER",
        "auto_escalate_after_min": 2880
      },
      {
        "step_order": 3,
        "role": "HR"
      }
    ]
  }'
```

---

## ⚙️ Policy Configuration (Admin)

### Get All Policies
```bash
curl http://localhost:3000/api/v1/policies \
  -H "Authorization: Bearer TOKEN"

# Returns:
{
  "max_overtime_day_min": 240,        # 4 hours
  "max_overtime_week_min": 720,       # 12 hours
  "night_multiplier": 1.5,
  "holiday_multiplier": 2.0,
  "submission_deadline_days": 3
}
```

### Update Policy
```bash
curl -X PUT http://localhost:3000/api/v1/policies/max_overtime_day_min \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "minutes": 360  # Change max to 6 hours
    }
  }'
```

---

## 📊 Attendance Logs (Integration)

### Get User's Attendance Logs
```bash
curl "http://localhost:3000/api/v1/attendance-logs/user-uuid?startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer TOKEN"

# Response:
{
  "logs": [
    {
      "id": "log-123",
      "userId": "user-uuid",
      "check_in": "2025-12-15T08:00:00Z",
      "check_out": "2025-12-15T18:00:00Z",
      "source": "device",
      "verified": true,
      "created_at": "2025-12-15T08:00:00Z"
    }
  ]
}
```

### Seed Attendance Data (Mock - Admin)
```bash
curl -X POST http://localhost:3000/api/v1/attendance-logs \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "check_in": "2025-12-15T08:00:00Z",
    "check_out": "2025-12-15T18:00:00Z",
    "source": "manual",
    "verified": true
  }'
```

---

## ❌ Error Responses

### Validation Error
```json
{
  "success": false,
  "status": 400,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "start_at": "Start time is required",
      "end_at": "End time is required"
    }
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

### Business Rule Violation
```json
{
  "success": false,
  "status": 422,
  "message": "Overtime request violates business rules",
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "details": {
      "violations": [
        "Daily overtime limit exceeded. Maximum: 4 hours",
        "Overlapping overtime request already exists"
      ]
    }
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

### Authentication Error
```json
{
  "success": false,
  "status": 401,
  "message": "Invalid or expired token",
  "error": {
    "code": "AUTHENTICATION_ERROR"
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

### Authorization Error
```json
{
  "success": false,
  "status": 403,
  "message": "This action requires one of: SUPERVISOR, MANAGER, HR",
  "error": {
    "code": "AUTHORIZATION_ERROR"
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

### Conflict Error (Duplicate Submission)
```json
{
  "success": false,
  "status": 409,
  "message": "Overtime period overlaps with existing request",
  "error": {
    "code": "OVERLAP_DETECTED"
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

### Idempotency Error
```json
{
  "success": false,
  "status": 409,
  "message": "Missing X-Idempotency-Key header",
  "error": {
    "code": "IDEMPOTENCY_ERROR"
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

---

## 🧪 Testing with cURL

### 1. Login & Get Token
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.data.accessToken')

echo "Token: $TOKEN"
```

### 2. Create Overtime Request
```bash
IDEMPOTENCY_KEY=$(uuidgen)

curl -X POST http://localhost:3000/api/v1/overtime-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "start_at": "2025-12-15T18:00:00Z",
    "end_at": "2025-12-15T21:00:00Z",
    "reason": "Test request"
  }' | jq
```

### 3. Get Request ID
```bash
REQUEST_ID=$(curl -s http://localhost:3000/api/v1/overtime-requests \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.data.items[0].id')

echo "Request ID: $REQUEST_ID"
```

### 4. Approve Request
```bash
curl -X POST http://localhost:3000/api/v1/overtime-requests/$REQUEST_ID/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED","comment":"Looks good"}' | jq
```

---

## 📚 Role-Based Access

| Action | EMPLOYEE | SUPERVISOR | MANAGER | HR | ADMIN |
|--------|----------|-----------|---------|-----|-------|
| Submit Own Request | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Own Requests | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Team Requests | ❌ | ✅ | ✅ | ✅ | ✅ |
| View All Requests | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve Requests | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage Approval Chains | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configure Policies | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Audit Logs | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 🐛 Debugging Tips

### Enable Development Logging
```bash
# In .env
LOG_LEVEL=debug
```

### Check Prisma Schema
```bash
npm run db:studio  # Opens Prisma Studio GUI
```

### View Request/Response in Browser DevTools
- Open http://localhost:3000
- Open DevTools (F12)
- Go to Network tab
- Make API request
- Click on request to see headers, body, response

### Common Issues

**401 Unauthorized**
- Token expired → get new token with refresh token
- Missing Bearer prefix → use "Bearer <token>"
- Wrong token format → regenerate token

**400 Validation Error**
- Missing required fields → check request body
- Invalid date format → use ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
- Missing X-Idempotency-Key → add header

**409 Conflict**
- Overlapping request → submit at different time
- Duplicate submission → use same idempotency key for retry

**422 Business Rule Violation**
- Daily limit exceeded → submit tomorrow
- Weekly limit exceeded → wait for current week to end
- Submission deadline passed → can't submit >3 days after work

---

**Last Updated**: December 8, 2025
**API Version**: v1.0.0
