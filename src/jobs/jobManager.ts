import * as cron from "node-cron";
import { generateInvoices } from "./generateInvoices";
import { sendInvoiceReminders } from "./sendInvoiceReminders";
import prisma from "../utils/prisma";

interface JobRegistry {
  [key: string]: cron.ScheduledTask;
}

const jobRegistry: JobRegistry = {};

export async function registerTenantJobs(providerId: string, providerName: string) {
  // clean existing
  if (jobRegistry[providerId]) unregisterTenantJobs(providerId);

  console.log(`📦 Registering background jobs for tenant: ${providerName} (${providerId})`);

  // Define your jobs
  const jobs = [
    {
      key: providerId,
      type: "invoice",
      schedule: "0 0 * * *", // every day at 12:00 AM
      task: () => generateInvoices(providerId),
    },
    {
      key: `${providerId}-reminder`,
      type: "reminder",
      schedule: "0 0 * * *", // every day at 12:00 AM
      task: () => sendInvoiceReminders(providerId),
    },
  ];
  // Schedule and persist
  for (const { key, schedule, task, type } of jobs) {
    const job = cron.schedule(schedule, task);
    job.start();
    jobRegistry[key] = job;

    // store to DB
    await prisma.cronJob.upsert({
      where: { providerId_type: { providerId, type } },
      update: { schedule, isActive: true },
      create: { providerId, providerName, schedule, type },
    });
  }
}


export async function unregisterTenantJobs(providerId: string) {
  const job = jobRegistry[providerId];
  const reminderJob = jobRegistry[`${providerId}-reminder`];

  job?.stop();
  reminderJob?.stop();

  delete jobRegistry[providerId];
  delete jobRegistry[`${providerId}-reminder`];

  await prisma.cronJob.updateMany({
    where: { providerId },
    data: { isActive: false },
  });

  console.log(`🧹 Stopped background jobs for tenant ${providerId}`);
}
