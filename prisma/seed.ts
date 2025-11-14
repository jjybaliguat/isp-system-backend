import { PrismaClient, UserRole, SubscriptionStatus, ClientStatus, PaymentType, TaxStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1️⃣ Create Provider
  const provider = await prisma.provider.upsert({
    where: { email: "sierra@provider.com" },
    update: {},
    create: {
      name: "Sierra",
      companyName: "Sierra.Net Network and Data Solutions",
      companyAddress: "123 Main Street, Metro City",
      email: "sierra@provider.com",
      phoneNumber: "09123456789",
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  });

  // 2️⃣ Create Superadmin user
  const password = await bcrypt.hash("admin123456", 10);
  await prisma.user.upsert({
    where: { email: "sierra@provider.com" },
    update: {},
    create: {
      email: "sierra@provider.com",
      fullName: "Super Admin",
      password,
      role: UserRole.SUPERADMIN,
      providerId: provider.id,
    },
  });

  // 3️⃣ Create Client Types
  const clientTypes = ["Residential", "Business"];
  const createdClientTypes = [];
  for (const name of clientTypes) {
    const type = await prisma.clientType.upsert({
      where: { name_providerId: { name, providerId: provider.id } },
      update: {},
      create: { name, providerId: provider.id },
    });
    createdClientTypes.push(type);
  }

  // 5️⃣ Create Service Plans
  const servicePlans = [
    {
      name: "Plan 699",
      speedMbps: 30,
      monthlyFee: 699,
      descriptions: ["Up to 30 Mbps Speed", "Unlimited Internet", "Pure Fiber"],
    },
    {
      name: "Plan 999",
      speedMbps: 50,
      monthlyFee: 999,
      descriptions: ["Up to 50 Mbps Speed", "Unlimited Internet", "Pure Fiber"],
    },
    {
      name: "Plan 1499",
      speedMbps: 100,
      monthlyFee: 1499,
      descriptions: ["Up to 100 Mbps Speed", "Unlimited Internet", "Premium Support"],
    },
  ];

  const createdPlans = [];
  for (const plan of servicePlans) {
    const sp = await prisma.servicePlan.upsert({
      where: { name: plan.name },
      update: {},
      create: {
        ...plan,
        providerId: provider.id,
      },
    });
    createdPlans.push(sp);
  }

  // 6️⃣ Create 1000 Clients
  console.log("👥 Creating 1000 clients...");
  const clients: any[] = [];

  for (let i = 0; i < 10000; i++) {
    const randomType = createdClientTypes[Math.floor(Math.random() * createdClientTypes.length)];
    const randomPlan = createdPlans[Math.floor(Math.random() * createdPlans.length)];
    const billingDay = Math.floor(Math.random() * 28) + 1;
    const phone = `09${Math.floor(100000000 + Math.random() * 900000000)}`;
    const accountNum = `${new Date().getFullYear().toString().slice(2)}${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    clients.push({
      code: `C${String(i + 1).padStart(5, "0")}`,
      fullName: `Client ${i + 1}`,
      email: `client${i + 1}@example.com`,
      phoneNumber: phone,
      address: `${i + 1} Example St, Metro City`,
      installationDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      accountNumber: accountNum,
      billingDay,
      mikrotikAccount: `client${i + 1}`,
      status: ClientStatus.ACTIVE,
      paymentType: PaymentType.POSTPAID,
      taxStatus: TaxStatus.NOT_ACTIVE,
      servicePlanId: randomPlan?.id,
      providerId: provider?.id,
      clientTypeId: randomType?.id
    });
  }

  // Batch insert in chunks (to avoid overload)
  const chunkSize = 100;
  for (let i = 0; i < clients.length; i += chunkSize) {
    const chunk = clients.slice(i, i + chunkSize);
    await prisma.client.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`✅ Inserted clients ${i + 1} - ${i + chunk.length}`);
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
