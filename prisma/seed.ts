import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const dept = await prisma.department.upsert({
    where: { name: "Engineering" },
    create: { name: "Engineering" },
    update: {}
  });

  const admin = await prisma.user.upsert({
    where: { employee_no: "EMP001" },
    create: {
      employee_no: "EMP001",
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
      departmentId: dept.id
    },
    update: {}
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

  console.log("Seed complete.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); });
