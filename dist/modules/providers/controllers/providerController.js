"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testTelegramConnection = exports.getTelegramSettings = exports.createTelegramSettings = exports.getSmsIntegrationSettings = exports.createSmsIntegrationSettings = exports.uploadProviderLogo = exports.updateAccount = exports.testSemaphoreConnection = exports.testXenditConnection = exports.getStoredKey = exports.updateSemaphoreKey = exports.updateXenditKey = exports.deleteProvider = exports.updateProvider = exports.createProvider = exports.getProviderById = exports.getProvidersWithFilteredResponse = exports.getProviders = exports.getOtherPaymentOptions = exports.getProvider = void 0;
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const hasher_1 = require("../../../utils/hasher");
const xendit_node_1 = __importDefault(require("xendit-node"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../../../utils/prisma"));
const sendTelegramNotification_1 = require("../../../helpers/sendTelegramNotification");
const getProvider = async (req, res) => {
    const { providerId } = req.user;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: {
                id: providerId
            },
            include: {
                otherPaymentOptions: true
            }
        });
        res.status(200).json(provider);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getProvider = getProvider;
const getOtherPaymentOptions = async (req, res) => {
    const { providerId } = req.user;
    try {
        const paymentOptions = await prisma_1.default.otherPaymentOptions.findMany({
            where: {
                providerId
            }
        });
        return res.status(200).json(paymentOptions);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getOtherPaymentOptions = getOtherPaymentOptions;
const getProviders = async (req, res) => {
    const { providerId } = req.user;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const branchStatus = typeof req.query.status === "string" && req.query.status !== "All"
        ? req.query.status
        : undefined;
    if (!providerId) {
        return res.status(401).json({ message: "Provider ID not found in token" });
    }
    const skip = (page - 1) * limit;
    try {
        const whereClause = {
            parentProviderId: providerId,
            ...(branchStatus && { branchStatus }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phoneNumber: { contains: search, mode: "insensitive" } }
                ],
            }),
        };
        const [providers, total] = await Promise.all([
            prisma_1.default.provider.findMany({
                where: whereClause,
                include: {
                    branches: true,
                    clients: true
                }
            }),
            prisma_1.default.provider.count({ where: whereClause })
        ]);
        return res.status(200).json({
            data: providers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getProviders = getProviders;
const getProvidersWithFilteredResponse = async (req, res) => {
    try {
        const provider = await prisma_1.default.provider.findFirst({
            where: {
                OR: [
                    { companyName: { contains: 'sierra', mode: 'insensitive' } },
                    { email: { contains: 'sierra', mode: 'insensitive' } },
                ],
                parentProviderId: null
            },
            select: {
                id: true,
                companyName: true,
                email: true,
                servicePlans: true,
                coverage: true,
                branches: {
                    select: {
                        id: true,
                        name: true,
                        servicePlans: true,
                        coverage: true,
                    },
                },
            },
        });
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }
        // 🔁 Merge main provider + branches into ONE array
        const unifiedProviders = [
            {
                id: provider.id,
                name: provider.companyName,
                email: provider.email,
                servicePlans: provider.servicePlans,
                coverage: provider.coverage,
                type: 'MAIN',
            },
            ...provider.branches.map((branch) => ({
                id: branch.id,
                name: branch.name,
                servicePlans: branch.servicePlans,
                coverage: branch.coverage,
                parentProviderId: provider.id,
                type: 'BRANCH',
            })),
        ];
        return res.status(200).json(unifiedProviders);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Failed to fetch provider' });
    }
};
exports.getProvidersWithFilteredResponse = getProvidersWithFilteredResponse;
const getProviderById = async (req, res) => {
    const { id } = req.params;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: {
                id
            }
        });
        if (!provider)
            return res.status(404).json({
                message: 'Provider not found'
            });
        res.status(200).json(provider);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getProviderById = getProviderById;
const createProvider = async (req, res) => {
    const { name, companyName, companyAddress, email, phoneNumber } = req.body;
    const { providerId } = req.user;
    const requiredFields = { name, companyName, companyAddress, email, phoneNumber };
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => value === undefined || value === null || value === '')
        .map(([key]) => key);
    if (missingFields.length > 0) {
        const errors = {};
        missingFields.forEach(field => {
            errors[field] = `${field} is required`;
        });
        return res.status(400).json({ ...errors });
    }
    try {
        const existingProvider = await prisma_1.default.provider.findUnique({
            where: { email }
        });
        if (existingProvider) {
            return res.status(409).json({ message: 'Provider with this email already exists' });
        }
        const newProvider = await prisma_1.default.provider.create({
            data: {
                ...req.body,
                parentProviderId: providerId,
                providerType: client_1.ProviderType.BRANCH
            }
        });
        const hashedPassword = await bcryptjs_1.default.hash("admin123456", 10);
        await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName: name,
                role: "SUPERADMIN",
                providerId: newProvider.id
            }
        });
        return res.status(201).json(newProvider);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createProvider = createProvider;
const updateProvider = async (req, res) => {
    const { id } = req.params;
    const { name, companyName, companyAddress, email, phoneNumber } = req.body;
    if (!(0, uuid_1.validate)(id)) {
        return res.status(400).json({ message: "Invalid provider ID format" });
    }
    try {
        const existingProvider = await prisma_1.default.provider.findUnique({
            where: { id }
        });
        if (!existingProvider) {
            return res.status(404).json({ message: 'Provider not found' });
        }
        const updatedProvider = await prisma_1.default.provider.update({
            where: { id },
            data: {
                name: name ?? existingProvider.name,
                companyName: companyName ?? existingProvider.companyName,
                companyAddress: companyAddress ?? existingProvider.companyAddress,
                email: email ?? existingProvider.email,
                phoneNumber: phoneNumber ?? existingProvider.phoneNumber
            }
        });
        return res.status(200).json(updatedProvider);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateProvider = updateProvider;
const deleteProvider = async (req, res) => {
    const { id } = req.params;
    const { providerId } = req.user;
    if (!(0, uuid_1.validate)(id)) {
        return res.status(400).json({ message: 'Invalid provider ID format' });
    }
    try {
        await prisma_1.default.provider.delete({
            where: {
                id,
                parentProviderId: providerId
            }
        });
        res.status(204).send();
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteProvider = deleteProvider;
const updateXenditKey = async (req, res) => {
    const { apiKey, convenienceFee, expiration } = req.body;
    const { providerId, role } = req.user;
    if (role !== client_1.UserRole.SUPERADMIN) {
        return res.status(403).json({
            message: "You are not allowed to perform this operation",
        });
    }
    try {
        const data = {};
        if (apiKey && apiKey.trim() !== "") {
            data.xenditApiKey = (0, hasher_1.encrypt)(apiKey);
        }
        if (expiration !== undefined) {
            const days = Number(expiration);
            if (!Number.isFinite(days) || days <= 0) {
                return res.status(400).json({
                    message: "Invoice expiration must be a positive number",
                });
            }
            data.invoiceDurationDays = days;
        }
        if (convenienceFee !== undefined) {
            const fee = Number(convenienceFee);
            if (!Number.isFinite(fee) || fee < 0) {
                return res.status(400).json({
                    message: "Convenience fee must be 0 or greater",
                });
            }
            data.paymentConvenienceFee = fee;
        }
        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                message: "No valid fields provided for update",
            });
        }
        await prisma_1.default.provider.update({
            where: { id: providerId },
            data,
        });
        return res.status(200).json({
            message: "Xendit settings updated successfully",
        });
    }
    catch (error) {
        console.error("updateXenditKey error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateXenditKey = updateXenditKey;
const updateSemaphoreKey = async (req, res) => {
    const { key } = req.body;
    const { providerId, role } = req.user;
    if (role !== client_1.UserRole.SUPERADMIN)
        return res.status(401).json({ message: "You are not allowed to perform this operation" });
    try {
        const encryptedKey = (0, hasher_1.encrypt)(key);
        const newKey = await prisma_1.default.provider.update({
            where: {
                id: providerId
            },
            data: {
                semaphoreApiKey: encryptedKey
            }
        });
        return res.status(200).json(newKey.semaphoreApiKey);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateSemaphoreKey = updateSemaphoreKey;
const getStoredKey = async (req, res) => {
    const { providerId } = req.user;
    try {
        const provider = await prisma_1.default.provider.findUnique({
            where: {
                id: providerId
            },
            select: {
                xenditApiKey: true,
                semaphoreApiKey: true,
                paymentConvenienceFee: true,
                invoiceDurationDays: true
            }
        });
        return res.status(200).json({
            xendit: {
                apiKey: provider?.xenditApiKey,
                convenienceFee: provider?.paymentConvenienceFee,
                expiration: provider?.invoiceDurationDays
            },
            semaphoreApiKey: provider?.semaphoreApiKey
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getStoredKey = getStoredKey;
const testXenditConnection = async (req, res) => {
    try {
        const xenditKey = req.xenditKey;
        const xenditClient = new xendit_node_1.default({
            secretKey: xenditKey,
        });
        const { Invoice } = xenditClient;
        await Invoice.getInvoices();
        return res.status(200).json({ message: "Connection Succeeded" });
    }
    catch (error) {
        console.log(error.response.message);
        res.status(500).json({ message: error.response.message });
    }
};
exports.testXenditConnection = testXenditConnection;
const testSemaphoreConnection = async (req, res) => {
    try {
        const smsKey = req.smsKey;
        const response = await fetch(`https://api.semaphore.co/api/v4/messages?apikey=${smsKey}&limit=5`);
        const data = await response.json();
        if (data.apikey) {
            return res.status(400).json({ message: data.apikey[0] });
        }
        return res.status(200).json({ message: "Connection Succeeded" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.testSemaphoreConnection = testSemaphoreConnection;
const updateAccount = async (req, res) => {
    const { userId, fullName, email, companyEmail, companyName, companyAddress, phoneNumber } = req.body;
    const { providerId } = req.user;
    try {
        // update user first
        const updatedUser = await prisma_1.default.user.update({
            where: {
                id: userId,
                providerId
            },
            data: {
                fullName,
                email
            }
        });
        // perform provider update
        const updatedProvider = await prisma_1.default.provider.update({
            where: {
                id: providerId
            },
            data: {
                companyName,
                companyAddress,
                phoneNumber,
                email: companyEmail
            }
        });
        // If logo changed and previous logo is a local uploads file, attempt to delete the old file
        const returnData = {
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            companyEmail: updatedProvider.email,
            companyName: updatedProvider.companyName,
            companyAddress: updatedProvider.companyAddress,
            phoneNumber: updatedProvider.phoneNumber,
            companyLogoUrl: updatedProvider.companyLogoUrl
        };
        return res.status(200).json(returnData);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateAccount = updateAccount;
// Upload provider logo handler
const uploadProviderLogo = async (req, res) => {
    try {
        const { providerId } = req.user;
        if (!providerId) {
            return res.status(401).json({ message: 'Provider not authenticated' });
        }
        // multer should have populated req.file
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // determine folder name from destination
        const destination = file.destination || '';
        const folderName = destination ? path_1.default.basename(destination) : '';
        // Force https in production so returned URLs are secure. When developing locally, use req.protocol.
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
        const fileUrl = `${protocol}://${req.get('host')}/uploads/${folderName}/${file.filename}`;
        // update provider with new logo url and delete old if needed
        const existingProvider = await prisma_1.default.provider.findUnique({ where: { id: providerId }, select: { companyLogoUrl: true } });
        const updatedProvider = await prisma_1.default.provider.update({ where: { id: providerId }, data: { companyLogoUrl: fileUrl } });
        // delete old file if it was local and different
        try {
            if (existingProvider?.companyLogoUrl && existingProvider.companyLogoUrl !== fileUrl && existingProvider.companyLogoUrl.includes('/uploads/')) {
                const uploadsRoot = path_1.default.resolve(__dirname, "../../../../uploads");
                const idx = existingProvider.companyLogoUrl.indexOf('/uploads/');
                const relPath = existingProvider.companyLogoUrl.substring(idx + '/uploads/'.length);
                const filePath = path_1.default.join(uploadsRoot, relPath.replace(/\//g, path_1.default.sep));
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
        }
        catch (delErr) {
            console.error('Failed to delete previous logo after upload:', delErr);
        }
        return res.status(200).json({ url: fileUrl, provider: { id: updatedProvider.id, companyLogoUrl: updatedProvider.companyLogoUrl } });
    }
    catch (error) {
        console.error('uploadProviderLogo error', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.uploadProviderLogo = uploadProviderLogo;
const createSmsIntegrationSettings = async (req, res) => {
    const { sendWhenBillIsMade, sendWhenBillIsDue, sendWhenPaymentIsMade, sendWhenCustomerAdded, sendDaysBeforeDue, sendWhenBillIsMadeTemplate, sendWhenBillIsDueTemplate, sendWhenPaymentIsMadeTemplate, sendWhenCustomerAddedTemplate, sendDaysBeforeDueTemplate } = req.body;
    const { providerId } = req.user;
    try {
        const existingSettings = await prisma_1.default.smsIntegrationSettings.findUnique({
            where: {
                providerId
            }
        });
        if (existingSettings) {
            const updatedSettings = await prisma_1.default.smsIntegrationSettings.update({
                where: {
                    providerId
                },
                data: {
                    sendWhenBillIsMade: sendWhenBillIsMade !== undefined ? sendWhenBillIsMade : existingSettings.sendWhenBillIsMade,
                    sendWhenBillIsDue: sendWhenBillIsDue !== undefined ? sendWhenBillIsDue : existingSettings.sendWhenBillIsDue,
                    sendWhenPaymentIsMade: sendWhenPaymentIsMade !== undefined ? sendWhenPaymentIsMade : existingSettings.sendWhenPaymentIsMade,
                    sendWhenCustomerAdded: sendWhenCustomerAdded !== undefined ? sendWhenCustomerAdded : existingSettings.sendWhenCustomerAdded,
                    sendDaysBeforeDueEnabled: sendDaysBeforeDue !== undefined ? sendDaysBeforeDue.enabled : existingSettings.sendDaysBeforeDueEnabled,
                    sendDaysBeforeDueDays: sendDaysBeforeDue !== undefined ? sendDaysBeforeDue.daysBefore : existingSettings.sendDaysBeforeDueDays,
                    sendWhenBillIsMadeTemplate: sendWhenBillIsMadeTemplate !== undefined ? sendWhenBillIsMadeTemplate : existingSettings.sendWhenBillIsMadeTemplate,
                    sendWhenBillIsDueTemplate: sendWhenBillIsDueTemplate !== undefined ? sendWhenBillIsDueTemplate : existingSettings.sendWhenBillIsDueTemplate,
                    sendWhenPaymentIsMadeTemplate: sendWhenPaymentIsMadeTemplate !== undefined ? sendWhenPaymentIsMadeTemplate : existingSettings.sendWhenPaymentIsMadeTemplate,
                    sendWhenCustomerAddedTemplate: sendWhenCustomerAddedTemplate !== undefined ? sendWhenCustomerAddedTemplate : existingSettings.sendWhenCustomerAddedTemplate,
                    sendDaysBeforeDueTemplate: sendDaysBeforeDueTemplate !== undefined ? sendDaysBeforeDueTemplate : existingSettings.sendDaysBeforeDueTemplate
                }
            });
            return res.status(200).json(updatedSettings);
        }
        else {
            const settings = await prisma_1.default.smsIntegrationSettings.create({
                data: {
                    providerId,
                    sendWhenBillIsMade,
                    sendWhenBillIsDue,
                    sendWhenPaymentIsMade,
                    sendWhenCustomerAdded,
                    sendDaysBeforeDueEnabled: sendDaysBeforeDue.enabled,
                    sendDaysBeforeDueDays: sendDaysBeforeDue.daysBefore,
                    sendWhenBillIsMadeTemplate,
                    sendWhenBillIsDueTemplate,
                    sendWhenPaymentIsMadeTemplate,
                    sendWhenCustomerAddedTemplate,
                    sendDaysBeforeDueTemplate
                }
            });
            return res.status(201).json(settings);
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createSmsIntegrationSettings = createSmsIntegrationSettings;
const getSmsIntegrationSettings = async (req, res) => {
    const { providerId } = req.user;
    try {
        const settings = await prisma_1.default.smsIntegrationSettings.findUnique({
            where: {
                providerId
            }
        });
        if (!settings) {
            return res.status(404).json({ message: "SMS Integration Settings not found" });
        }
        return res.status(200).json(settings);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getSmsIntegrationSettings = getSmsIntegrationSettings;
const createTelegramSettings = async (req, res) => {
    const { enabled, type, chatId, botToken } = req.body;
    const { providerId } = req.user;
    try {
        const existingSettings = await prisma_1.default.telegramSettings.findUnique({
            where: {
                providerId,
                type
            }
        });
        if (existingSettings) {
            const updatedSettings = await prisma_1.default.telegramSettings.update({
                where: {
                    providerId,
                    type
                },
                data: {
                    enabled: enabled !== undefined ? enabled : existingSettings.enabled,
                    chatId,
                    botToken
                }
            });
            return res.status(200).json(updatedSettings);
        }
        else {
            const settings = await prisma_1.default.telegramSettings.create({
                data: {
                    enabled: enabled !== undefined ? enabled : false,
                    providerId,
                    type,
                    chatId,
                    botToken
                }
            });
            return res.status(201).json(settings);
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createTelegramSettings = createTelegramSettings;
const getTelegramSettings = async (req, res) => {
    const { providerId } = req.user;
    try {
        const settings = await prisma_1.default.telegramSettings.findMany({
            where: {
                providerId
            }
        });
        return res.status(200).json(settings);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTelegramSettings = getTelegramSettings;
const testTelegramConnection = async (req, res) => {
    const { providerId } = req.user;
    const { type } = req.body;
    console.log("Testing Telegram connection with providerId:", providerId, "and type:", type);
    try {
        const response = await prisma_1.default.telegramSettings.findFirst({
            where: {
                providerId,
                type
            }
        });
        if (!response) {
            return res.status(404).json({ message: "Telegram settings not found for this type" });
        }
        const testNotif = await (0, sendTelegramNotification_1.sendTelegramMessage)("This is a test notification from ISP System. If you received this, the connection is successful!", response.botToken, response.chatId);
        if (!testNotif?.data?.ok) {
            return res.status(500).json({ message: "Failed to send test notification" });
        }
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.testTelegramConnection = testTelegramConnection;
//# sourceMappingURL=providerController.js.map