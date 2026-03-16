"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.TZ = 'Asia/Manila';
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const clientRoutes_1 = __importDefault(require("./modules/clients/routes/clientRoutes"));
const providerRoutes_1 = __importDefault(require("./modules/providers/routes/providerRoutes"));
const userRoutes_1 = __importDefault(require("./modules/users/routes/userRoutes"));
const authRoutes_1 = __importDefault(require("./modules/auth/route/authRoutes"));
const billingRoute_1 = __importDefault(require("./modules/billing/routes/billingRoute"));
const paymentRoute_1 = __importDefault(require("./modules/payments/routes/paymentRoute"));
const service_plan_routes_1 = __importDefault(require("./modules/service-plan/routes/service-plan-routes"));
const client_types_routes_1 = __importDefault(require("./modules/client-types/routes/client-types-routes"));
const analyticsRoute_1 = __importDefault(require("./modules/analytics/routes/analyticsRoute"));
const logsRoute_1 = __importDefault(require("./modules/logs/logsRoute"));
const ticketRoutes_1 = __importDefault(require("./modules/tickets/routes/ticketRoutes"));
const employeeRoute_1 = __importDefault(require("./modules/employees/routes/employeeRoute"));
const teamsRoute_1 = __importDefault(require("./modules/teams/routes/teamsRoute"));
const smsRoute_1 = __importDefault(require("./modules/sms/routes/smsRoute"));
const coverageRoute_1 = __importDefault(require("./modules/coverage/routes/coverageRoute"));
const applicantRoutes_1 = __importDefault(require("./modules/applicants/routes/applicantRoutes"));
const adminRoutes_1 = __importDefault(require("./modules/admin/routes/adminRoutes"));
const uploadImageRoute_1 = __importDefault(require("./modules/upload-image/uploadImageRoute"));
const settingsRoute_1 = __importDefault(require("./modules/settings/settingsRoute"));
const network_hierarchy_route_1 = __importDefault(require("./modules/network-hierarchy/network-hierarchy-route"));
const mikrotikRoutes_1 = __importDefault(require("./modules/mikrotik/mikrotikRoutes"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const jobManager_1 = require("./jobs/jobManager");
const node_cron_1 = __importDefault(require("node-cron"));
const checkOverdueInvoices_1 = require("./jobs/checkOverdueInvoices");
const dailyBackups_1 = require("./jobs/dailyBackups");
const client_1 = require("@prisma/client");
const sendSmsWhenTheBillIsDue_1 = require("./jobs/sendSmsWhenTheBillIsDue");
const collectMikrotikPPPoE_1 = require("./jobs/collectMikrotikPPPoE");
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const trustProxySetting = process.env.TRUST_PROXY ??
    (process.env.NODE_ENV === "production" ? 1 : false);
app.set("trust proxy", trustProxySetting);
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = path_1.default.resolve(__dirname, "../uploads");
app.use("/uploads", express_1.default.static(UPLOAD_DIR));
(async () => {
    try {
        const jobs = await prisma.cronJob.findMany({
            where: { isActive: true },
        });
        for (const job of jobs) {
            await (0, jobManager_1.registerTenantJobs)(job.providerId, job.providerName);
        }
        console.log(`✅ Restored ${jobs.length} background jobs.`);
    }
    catch (error) {
        console.error("❌ Failed to restore jobs:", error);
    }
})();
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        const allowedOrigins = ["http://localhost:3000", "https://sierracommunication.net", "https://www.sierracommunication.net", "https://sierracommunication.vercel.app"];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/clients', clientRoutes_1.default);
app.use('/api/providers', providerRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/billing', billingRoute_1.default);
app.use('/api/payments', paymentRoute_1.default);
app.use('/api/service-plans', service_plan_routes_1.default);
app.use('/api/client-types', client_types_routes_1.default);
app.use("/api/analytics", analyticsRoute_1.default);
app.use("/api/logs", logsRoute_1.default);
app.use("/api/tickets", ticketRoutes_1.default);
app.use("/api/employees", employeeRoute_1.default);
app.use("/api/teams", teamsRoute_1.default);
app.use("/api/sms", smsRoute_1.default);
app.use("/api/coverage", coverageRoute_1.default);
app.use('/api/applicants', applicantRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use("/api/upload-image", uploadImageRoute_1.default);
app.use("/api/settings", settingsRoute_1.default);
app.use("/api/network-hierarchy", network_hierarchy_route_1.default);
app.use("/api/mikrotik", mikrotikRoutes_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
node_cron_1.default.schedule('0 0 * * *', async () => {
    console.log("Running test cron job:", new Date().toLocaleString());
    try {
        await (0, checkOverdueInvoices_1.checkOverdueInvoices)();
        await (0, sendSmsWhenTheBillIsDue_1.sendSmsWhenTheBillIsDue)();
    }
    catch (error) {
        console.error("Error in daily cron job:", error);
    }
}, { timezone: "Asia/Manila" });
(0, dailyBackups_1.scheduleDailyBackups)();
(0, collectMikrotikPPPoE_1.collectPPPoESessionsBandwidth)();
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map