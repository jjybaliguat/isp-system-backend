"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBackupSettings = exports.updateDocumentsSettings = exports.updateBillingSettings = exports.updatePaymentOptions = exports.updatePaymentSettings = exports.updateNotificationsSettings = void 0;
const jobManager_1 = require("../../jobs/jobManager");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const updateNotificationsSettings = async (req, res) => {
    const { enabled, emailUser, emailPass, emailHost, emailPort, senderName, invoiceReminderTemplate, paymentConfirmationTemplate, overdueNoticeTemplate } = req.body;
    const { providerId } = req.user;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: { id: providerId },
            select: { settings: true },
        });
        if (!provider) {
            return res.status(404).json({ message: "Provider not found" });
        }
        const currentSettings = typeof provider.settings === "object" && provider.settings !== null
            ? provider.settings
            : {};
        const updatedSettings = {
            ...currentSettings,
            notifications: {
                ...currentSettings?.notifications,
                enabled,
                emailUser,
                emailPass,
                emailHost,
                emailPort: Number(emailPort),
                senderName,
                invoiceReminderTemplate,
                paymentConfirmationTemplate,
                overdueNoticeTemplate,
            },
        };
        const updatedProvider = await prisma_1.default.provider.update({
            where: { id: providerId },
            data: {
                settings: updatedSettings,
            },
        });
        return res.status(200).json(updatedProvider);
    }
    catch (error) {
        console.error("Error updating notification settings:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateNotificationsSettings = updateNotificationsSettings;
const updatePaymentSettings = async (req, res) => {
    const { latePaymentGracePeriod } = req.body;
    const { providerId } = req.user;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: { id: providerId },
            select: { settings: true },
        });
        if (!provider) {
            return res.status(404).json({ message: "Provider not found" });
        }
        const currentSettings = typeof provider.settings === "object" && provider.settings !== null
            ? provider.settings
            : {};
        const updatedSettings = {
            ...currentSettings,
            payment: {
                ...currentSettings?.payment,
                latePaymentGracePeriod
            },
        };
        const updatedProvider = await prisma_1.default.provider.update({
            where: { id: providerId },
            data: {
                settings: updatedSettings,
            },
        });
        return res.status(200).json(updatedProvider);
    }
    catch (error) {
        console.error("Error updating payment settings:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updatePaymentSettings = updatePaymentSettings;
const updatePaymentOptions = async (req, res) => {
    const { id, providerId } = req.user;
    const { paymentOptions } = req.body;
    // if(!paymentOptions || paymentOptions.length == 0) return res.status(400).json({message: "Missing required fields"})
    try {
        const user = await prisma_1.default.user.findUnique({
            where: {
                id
            },
            select: {
                role: true
            }
        });
        if (user?.role !== "SUPERADMIN")
            return res.status(403).json({ message: "Forbidden: unable to perform the operation" });
        // delete all paymentOptions belongs to this provider
        await prisma_1.default.otherPaymentOptions.deleteMany({
            where: {
                providerId
            }
        });
        const otherPaymentOption = await prisma_1.default.otherPaymentOptions.createMany({
            data: paymentOptions.map((p) => {
                return {
                    ...p,
                    providerId
                };
            })
        });
        return res.status(200).json(otherPaymentOption);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.updatePaymentOptions = updatePaymentOptions;
const updateBillingSettings = async (req, res) => {
    const { autoInvoicing, invoiceGenerationDaysBeforeDue, sendInvoiceReminderDaysBeforeDue, } = req.body;
    const { providerId } = req.user;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: { id: providerId },
            select: { name: true, settings: true },
        });
        if (!provider) {
            return res.status(404).json({ message: "Provider not found" });
        }
        const currentSettings = typeof provider.settings === "object" && provider.settings !== null
            ? provider.settings
            : {};
        const updatedSettings = {
            ...currentSettings,
            billing: {
                ...currentSettings?.billing,
                autoInvoicing,
                invoiceGenerationDaysBeforeDue,
                sendInvoiceReminderDaysBeforeDue,
            },
        };
        const updatedProvider = await prisma_1.default.provider.update({
            where: { id: providerId },
            data: {
                settings: updatedSettings,
            },
        });
        if (autoInvoicing) {
            await (0, jobManager_1.registerTenantJobs)(providerId, provider.name);
        }
        else {
            await (0, jobManager_1.unregisterTenantJobs)(providerId);
        }
        return res.status(200).json(updatedProvider);
    }
    catch (error) {
        console.error("Error updating billing settings:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateBillingSettings = updateBillingSettings;
const updateDocumentsSettings = async (req, res) => {
    const { numberPrefix, 
    // startingNumber,
    // includeTax,
    // taxRate,
    companyLogoUrl, footerMessage } = req.body;
    const { providerId } = req.user;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: { id: providerId },
            select: { settings: true },
        });
        if (!provider) {
            return res.status(404).json({ message: "Provider not found" });
        }
        const currentSettings = typeof provider.settings === "object" && provider.settings !== null
            ? provider.settings
            : {};
        const updatedSettings = {
            ...currentSettings,
            invoiceDocument: {
                ...currentSettings?.invoiceDocument,
                numberPrefix,
                companyLogoUrl,
                footerMessage
            },
        };
        const updatedProvider = await prisma_1.default.provider.update({
            where: { id: providerId },
            data: {
                settings: updatedSettings,
            },
        });
        return res.status(200).json(updatedProvider);
    }
    catch (error) {
        console.error("Error updating documents settings:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateDocumentsSettings = updateDocumentsSettings;
const updateBackupSettings = async (req, res) => {
    const { providerId } = req.user;
    const { enabled, backUpEmail } = req.body;
    try {
        const updateProvider = await prisma_1.default.provider.update({
            where: {
                id: providerId
            },
            data: {
                dailyBackup: enabled,
                backUpEmail
            }
        });
        return res.status(200).json(updateProvider);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateBackupSettings = updateBackupSettings;
//# sourceMappingURL=settingsController.js.map