// Mock data for offline development and testing
export interface User {
  id: string;
  employee_no: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'SUPERVISOR' | 'MANAGER' | 'HR' | 'ADMIN';
}

export const MOCK_USERS: Record<string, User & { password: string }> = {
  'employee@example.com': {
    id: 'emp-001',
    employee_no: 'EMP001',
    name: 'John Doe',
    email: 'employee@example.com',
    role: 'EMPLOYEE',
    password: 'password123',
  },
  'manager@example.com': {
    id: 'mgr-001',
    employee_no: 'MGR001',
    name: 'Jane Smith',
    email: 'manager@example.com',
    role: 'MANAGER',
    password: 'password123',
  },
  'admin@example.com': {
    id: 'admin-001',
    employee_no: 'ADM001',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
    password: 'password123',
  },
};

export const MOCK_OVERTIME_REQUESTS = [
  {
    id: 'ot-001',
    userId: 'emp-001',
    date: '2025-12-10',
    start_time: '18:00',
    end_time: '20:00',
    total_minutes: 120,
    reason: 'Project deadline extension for client deliverable',
    status: 'SUBMITTED' as const,
    submitted_at: '2025-12-10T17:00:00',
    total_payment: 2400, // assuming 60/hr with 1.5x multiplier
  },
  {
    id: 'ot-002',
    userId: 'emp-001',
    date: '2025-12-09',
    start_time: '17:30',
    end_time: '19:30',
    total_minutes: 120,
    reason: 'Critical bug fix in production system',
    status: 'APPROVED' as const,
    submitted_at: '2025-12-09T17:00:00',
    total_payment: 2400,
  },
  {
    id: 'ot-003',
    userId: 'emp-001',
    date: '2025-12-08',
    start_time: '16:00',
    end_time: '17:30',
    total_minutes: 90,
    reason: 'Data migration task',
    status: 'REJECTED' as const,
    submitted_at: '2025-12-08T15:00:00',
    total_payment: 1800,
  },
];
