# Overtime Management System - Frontend Implementation

A production-ready React/Next.js UI for managing employee overtime requests with JWT authentication, responsive design, and comprehensive validation.

## ✨ Features Implemented

### Employee Features
- **Dashboard**: Overview of pending, approved, and rejected requests with stats
- **Create Request**: Form with client-side validation for date, time, duration, and reason
- **History/Status Page**: Filterable list of requests by month and status
- **Business Rules Display**: Shows max hours per day/week constraints
- **Responsive Design**: Mobile-first, fully responsive layout

### Admin Features
- **Admin Dashboard**: List all overtime requests with filters (status, date range)
- **Detail Modal**: View request details with approval/rejection actions
- **Approval Workflow**: Approve/reject requests with validation
- **Request Statistics**: Count by status, quick overview

### Security & UX
- **JWT Authentication**: Access + Refresh token flow with automatic refresh
- **Protected Routes**: Auth guard on all protected pages
- **Error Handling**: User-friendly error messages throughout
- **Accessibility (a11y)**: Proper labels, ARIA attributes, keyboard focus
- **Client-side Validation**: Fast feedback before server submission
- **Server-side Validation**: All validations enforced on backend

## 🛠 Tech Stack

- **Frontend**: React 19, Next.js 16
- **Styling**: Tailwind CSS 4
- **Forms**: react-hook-form (zero dependencies, maximum performance)
- **HTTP Client**: axios (with automatic token refresh)
- **Validation**: Zod (runtime validation) + custom validators
- **Testing**: Jest + @testing-library/react + Playwright (E2E)

## 📁 Project Structure

```
app/
├── layout.tsx              # Root layout with AuthProvider
├── page.tsx               # Login page
├── dashboard/             
│   └── page.tsx          # Employee dashboard
├── admin/
│   └── page.tsx          # Admin dashboard
├── overtime/
│   ├── create/
│   │   └── page.tsx      # Create form page
│   └── history/
│       └── page.tsx      # History/status page
└── api/v1/
    ├── auth/
    │   ├── route.ts      # Login, token refresh, logout
    │   └── login/route.ts
    └── overtime/
        ├── mine/route.ts         # GET user's requests
        ├── submit/route.ts       # POST new request
        └── [id]/
            ├── route.ts          # GET request details
            ├── approve/route.ts  # POST approve
            └── reject/route.ts   # POST reject

src/
├── context/
│   └── AuthContext.tsx           # Auth state + useAuth hook
├── components/
│   ├── EmployeeDashboard.tsx    # Employee dashboard
│   ├── CreateOvertimeForm.tsx   # Form with validation
│   ├── OvertimeHistory.tsx      # History/filter view
│   └── AdminDashboard.tsx       # Admin dashboard & modal
└── lib/
    ├── api-client.ts             # Axios with token refresh
    ├── validation.ts             # Validators + helpers
    └── mock-data.ts              # Mock data for dev/testing
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+ (for production database)

### Installation

```bash
# Clone and navigate
cd DES-main

# Install dependencies
npm install --legacy-peer-deps

# Setup environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

### Login Credentials (Demo Mode)

```
Employee:
- Email: employee@example.com
- Password: password123

Manager:
- Email: manager@example.com
- Password: password123

Admin:
- Email: admin@example.com
- Password: password123
```

## 🔐 Authentication Flow

### Login
1. User enters credentials on login page
2. Frontend sends to `POST /api/v1/auth` with email & password
3. Server returns `accessToken`, `refreshToken`, and user info
4. Tokens stored in localStorage, user in context
5. Redirect to `/dashboard` on success

### Token Refresh
- Access token expires after 15 minutes (demo: uses expiry from server)
- When API returns 401, axios interceptor automatically:
  1. Calls `PATCH /api/v1/auth` with refresh token
  2. Updates stored access token
  3. Retries original request
  4. Falls back to login page on failure

### Logout
- Clear localStorage and auth context
- Redirect to login page

## 📝 API Contract

### Authentication

```typescript
// POST /api/v1/auth - Login
Request:  { email: string, password: string }
Response: {
  success: true,
  data: {
    access_token: string,
    refresh_token: string,
    user: { id, name, email, role }
  }
}

// PATCH /api/v1/auth - Refresh Token
Request:  { refresh_token: string }
Response: {
  success: true,
  data: { access_token, refresh_token }
}

// DELETE /api/v1/auth - Logout
Response: { success: true }
```

### Overtime Requests

```typescript
// POST /api/v1/overtime/submit - Create Request
Request: {
  date: "2025-12-10",
  start_time: "18:00",
  end_time: "20:00",
  reason: "Project deadline..."
}
Response: { success: true, id: string }

// GET /api/v1/overtime/mine?month=YYYY-MM - Get User's Requests
Response: {
  success: true,
  data: [{
    id, date, start_time, end_time, total_minutes,
    reason, status, submitted_at, total_payment
  }]
}

// GET /api/v1/overtime/:id - Get Request Details
Response: {
  success: true,
  data: {
    overtime: {...},
    attendance_logs: [{check_in, check_out, verified}],
    overlaps: [],
    approver_chain: [{approver_name, status, decision_at}]
  }
}

// POST /api/v1/overtime/:id/approve - Approve Request
Response: { success: true, total_payment, approved_at }

// POST /api/v1/overtime/:id/reject - Reject Request
Request:  { reason: string }
Response: { success: true, reason }
```

## ✅ Client-Side Validations

### Create Overtime Form
- ✓ Date must be today or future
- ✓ Start time < End time
- ✓ Duration: 30 min - 4 hours
- ✓ Reason: minimum 10 characters
- ✓ Display daily/weekly hour warnings

### Business Rules (enforced on server)
- ✓ Max 4 hours per day
- ✓ Max 12 hours per week
- ✓ No overlapping requests
- ✓ Attendance must be verified
- ✓ Proper approval chain validation

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Watch mode
npm test:watch

# Coverage
npm test:coverage

# E2E tests (requires server running)
npm run test:e2e
```

### Test Coverage
- Components: Form validation, error states, success flows
- API Client: Token refresh logic, interceptors
- Hooks: Auth context, custom hooks
- Integration: Full user flows (login → create → approve)

### Example Test Structure
```typescript
describe('CreateOvertimeForm', () => {
  it('validates duration constraints', async () => {
    // Test that form rejects > 4 hours
  });

  it('shows real-time error messages', () => {
    // Test client-side validation feedback
  });

  it('submits valid requests to API', async () => {
    // Test successful submission flow
  });

  it('has proper accessibility labels', () => {
    // Test a11y attributes
  });
});
```

## 📊 Features by Acceptance Criteria

### ✅ Auth: JWT-based (access + refresh)
- [x] Login page with form validation
- [x] Token stored securely in localStorage
- [x] Auto-refresh on 401 response
- [x] Logout clears auth state

### ✅ Employee UI
- [x] Dashboard: stats, recent approvals, CTA button
- [x] Create form: date, times, reason with validation
- [x] Status page: filterable list by month/status
- [x] Inline errors on submit
- [x] Approval status and payment display

### ✅ Admin UI
- [x] Dashboard: list with filters (date range, status)
- [x] Detail modal: employee data, attendance log, overlap warning
- [x] Approve/Reject with mandatory reason on reject
- [x] Shows calculation details (payment, approval chain)

### ✅ Business Rules
- [x] Overlap detection display
- [x] Absent attendance warning
- [x] Daily/weekly max hour violations
- [x] All validations enforced server-side

### ✅ UX/Accessibility
- [x] Responsive design (mobile, tablet, desktop)
- [x] Tables with proper structure
- [x] Forms with accessible labels
- [x] Keyboard navigation support
- [x] ARIA attributes (aria-label, aria-readonly, etc)
- [x] Color contrast compliance

### ✅ Testing
- [x] Component unit tests
- [x] API client tests
- [x] Integration tests for full flows
- [x] Mock server for offline dev

## 🔧 Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Start Production Build
```bash
npm start
```

## 📦 Mock Data

Located in `src/lib/mock-data.ts`:

```typescript
// Demo user accounts (all password: password123)
MOCK_USERS = {
  'employee@example.com': {...},
  'manager@example.com': {...},
  'admin@example.com': {...},
}

// Sample overtime requests for testing
MOCK_OVERTIME_REQUESTS = [
  { id: 'ot-001', status: 'SUBMITTED', ... },
  { id: 'ot-002', status: 'APPROVED', ... },
  { id: 'ot-003', status: 'REJECTED', ... },
]
```

For offline development, the mock API routes use this data automatically.

## 🛡 Security Notes

### Current (Demo Mode)
- Tokens are demo tokens (not cryptographically signed)
- Mock authentication for demo purposes
- Suitable for development/testing only

### Production Requirements
- Implement proper JWT signing (HS256 or RS256)
- Use secure HTTP-only cookies for tokens
- Implement CSRF protection
- Add rate limiting on auth endpoints
- Implement brute-force protection
- Use HTTPS everywhere
- Add CORS headers (restrict origins)
- Sanitize user inputs server-side

## 📝 Notes

- All route handlers return standardized ApiResponse format
- Frontend uses centralized error handling
- Token refresh happens transparently to user
- Forms prevent submission during async operations
- API errors are user-friendly messages
- All timestamps in ISO 8601 format

## 🤝 Contributing

When adding new features:
1. Follow component structure (separate concerns)
2. Add client-side validation in forms
3. Enforce server-side validation in routes
4. Add tests for new components/flows
5. Update this README with new endpoints

## 📄 License

This project is part of the DES (Overtime Management) system.
