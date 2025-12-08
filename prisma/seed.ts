import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const dept = await prisma.department.upsert({
    where: { name: "Engineering" },
    create: { name: "Engineering" },
    update: {}
  });

  // Hash password for admin user
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { employee_no: "EMP001" },
    create: {
      employee_no: "EMP001",
      name: "Admin User",
      email: "admin@example.com",
      password_hash: passwordHash,
      role: "ADMIN",
      departmentId: dept.id
    },
    update: {
      password_hash: passwordHash
    }
  });

  // Create test users
  const managerPassword = await bcrypt.hash("password123", 10);
  const manager = await prisma.user.upsert({
    where: { employee_no: "EMP002" },
    create: {
      employee_no: "EMP002",
      name: "Manager User",
      email: "manager@example.com",
      password_hash: managerPassword,
      role: "MANAGER",
      departmentId: dept.id
    },
    update: {
      password_hash: managerPassword
    }
  });

  const employeePassword = await bcrypt.hash("password123", 10);
  const employee = await prisma.user.upsert({
    where: { employee_no: "EMP003" },
    create: {
      employee_no: "EMP003",
      name: "Employee User",
      email: "employee@example.com",
      password_hash: employeePassword,
      role: "EMPLOYEE",
      departmentId: dept.id
    },
    update: {
      password_hash: employeePassword
    }
  });

  const configs = [
    { key: "max_overtime_day_min", value: { minutes: 240 } },
    { key: "max_overtime_week_min", value: { minutes: 720 } },
    { key: "night_multiplier", value: { multiplier: 1.5, start: "22:00", end: "06:00" } },
    { key: "holiday_multiplier", value: { multiplier: 2.0 } }
  ];

  for (const c of configs) {
    await prisma.policyConfig.upsert({
      where: { key: c.key },
      update: { value: c.value },
      create: { key: c.key, value: c.value }
    });
  }

  console.log("Seed complete. Created admin, manager, and employee users.");
  console.log(`Admin: email=admin@example.com, password=password123`);
  console.log(`Manager: email=manager@example.com, password=password123`);
  console.log(`Employee: email=employee@example.com, password=password123`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); });
