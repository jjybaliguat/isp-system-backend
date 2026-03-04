process.env.TZ = 'Asia/Manila';

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import clientRoutes from './modules/clients/routes/clientRoutes';
import providerRoutes from './modules/providers/routes/providerRoutes';
import userRoutes from './modules/users/routes/userRoutes';
import authRoutes from './modules/auth/route/authRoutes';
import billingRoute from './modules/billing/routes/billingRoute';
import paymentsRoute from './modules/payments/routes/paymentRoute';
import servicePlansRoute from './modules/service-plan/routes/service-plan-routes'
import clientTypesRoute from './modules/client-types/routes/client-types-routes'
import analyticsRoute from './modules/analytics/routes/analyticsRoute'
import logsRoute from './modules/logs/logsRoute'
import ticketsRoute from './modules/tickets/routes/ticketRoutes'
import employeesRoute from './modules/employees/routes/employeeRoute'
import teamsRoute from './modules/teams/routes/teamsRoute' 
import smsRoute from './modules/sms/routes/smsRoute' 
import coverageRoute from './modules/coverage/routes/coverageRoute' 
import applicantRoutes from './modules/applicants/routes/applicantRoutes'
import adminRoutes from './modules/admin/routes/adminRoutes'
import uploadImageRoute from './modules/upload-image/uploadImageRoute' 
import settingsRoute from './modules/settings/settingsRoute' 
import hierarchyRoute from './modules/network-hierarchy/network-hierarchy-route' 
import cookieParser from "cookie-parser";
import { registerTenantJobs } from "./jobs/jobManager";
import cron from 'node-cron'
import { checkOverdueInvoices } from './jobs/checkOverdueInvoices';
import { scheduleDailyBackups } from './jobs/dailyBackups';
import { PrismaClient } from '@prisma/client';
import { sendSmsWhenTheBillIsDue } from './jobs/sendSmsWhenTheBillIsDue';

const prisma = new PrismaClient();

const app = express();

const trustProxySetting =
  process.env.TRUST_PROXY ??
  (process.env.NODE_ENV === "production" ? 1 : false);

app.set("trust proxy", trustProxySetting);

const PORT = process.env.PORT || 5000;

const UPLOAD_DIR = path.resolve(__dirname, "../uploads");

app.use("/uploads", express.static(UPLOAD_DIR));


(async () => {
  try {
    const jobs = await prisma.cronJob.findMany({
      where: { isActive: true },
    });
    
    for (const job of jobs) {
      await registerTenantJobs(job.providerId, job.providerName);
    }
    
    console.log(`✅ Restored ${jobs.length} background jobs.`);
  } catch (error) {
    console.error("❌ Failed to restore jobs:", error);
  }
})();

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = ["http://localhost:3000", "https://sierracommunication.net", "https://www.sierracommunication.net", "https://sierracommunication.vercel.app"];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/api/clients', clientRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/users', userRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/billing', billingRoute)
app.use('/api/payments', paymentsRoute)
app.use('/api/service-plans', servicePlansRoute)
app.use('/api/client-types', clientTypesRoute)
app.use("/api/analytics", analyticsRoute)
app.use("/api/logs", logsRoute)
app.use("/api/tickets", ticketsRoute)
app.use("/api/employees", employeesRoute)
app.use("/api/teams", teamsRoute)
app.use("/api/sms", smsRoute)
app.use("/api/coverage", coverageRoute)
app.use('/api/applicants', applicantRoutes)
app.use('/api/admin', adminRoutes)
app.use("/api/upload-image", uploadImageRoute)
app.use("/api/settings", settingsRoute)
app.use("/api/network-hierarchy", hierarchyRoute)

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
})

cron.schedule('0 0 * * *', async () => {
  console.log("Running test cron job:", new Date().toLocaleString());
  try {
    await checkOverdueInvoices();
    await sendSmsWhenTheBillIsDue();
  } catch (error) {
    console.error("Error in daily cron job:", error);
  }
}, { timezone: "Asia/Manila" });

// Schedule daily provider backups (providers with dailyBackup=true)
scheduleDailyBackups();


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})