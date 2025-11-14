"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAccount = exports.testSemaphoreConnection = exports.testXenditConnection = exports.getStoredKey = exports.updateSemaphoreKey = exports.updateXenditKey = exports.deleteProvider = exports.updateProvider = exports.createProvider = exports.getProviderById = exports.getProvider = exports.getProviders = void 0;
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
const hasher_1 = require("../../../utils/hasher");
const xendit_node_1 = __importDefault(require("xendit-node"));
const client_2 = require("@prisma/client");
const prisma = new client_2.PrismaClient();
const getProviders = async (req, res) => {
    try {
        const providers = await prisma.provider.findMany();
        res.status(200).json(providers);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getProviders = getProviders;
const getProvider = async (req, res) => {
    const { providerId } = req.user;
    try {
        const providers = await prisma.provider.findUnique({
            where: { id: providerId }
        });
        res.status(200).json(providers);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getProvider = getProvider;
const getProviderById = async (req, res) => {
    const { id } = req.params;
    try {
        const provider = await prisma.provider.findUnique({
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
        const existingProvider = await prisma.provider.findUnique({
            where: { email }
        });
        if (existingProvider) {
            return res.status(409).json({ message: 'Provider with this email already exists' });
        }
        const newProvider = await prisma.provider.create({
            data: req.body
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
        const existingProvider = await prisma.provider.findUnique({
            where: { id }
        });
        if (!existingProvider) {
            return res.status(404).json({ message: 'Provider not found' });
        }
        const updatedProvider = await prisma.provider.update({
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
    if (!(0, uuid_1.validate)(id)) {
        return res.status(400).json({ message: 'Invalid provider ID format' });
    }
    try {
        await prisma.provider.delete({
            where: { id }
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
    const { key } = req.body;
    const { providerId, role } = req.user;
    if (role !== client_1.UserRole.SUPERADMIN)
        return res.status(401).json({ message: "You are not allowed to perform this operation" });
    try {
        const encryptedKey = (0, hasher_1.encrypt)(key);
        const newKey = await prisma.provider.update({
            where: {
                id: providerId
            },
            data: {
                xenditApiKey: encryptedKey
            }
        });
        return res.status(200).json(newKey.xenditApiKey);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
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
        const newKey = await prisma.provider.update({
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
        const keys = await prisma.provider.findUnique({
            where: {
                id: providerId
            },
            select: {
                xenditApiKey: true,
                semaphoreApiKey: true
            }
        });
        return res.status(200).json({ xenditApiKey: keys?.xenditApiKey, semaphoreApiKey: keys?.semaphoreApiKey });
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
    const { userId, fullName, email, companyEmail, companyName, companyAddress, phoneNumber, companyLogoUrl } = req.body;
    const { providerId } = req.user;
    try {
        const updatedUser = await prisma.user.update({
            where: {
                id: userId,
                providerId
            },
            data: {
                fullName,
                email
            }
        });
        const updatedProvider = await prisma.provider.update({
            where: {
                id: providerId
            },
            data: {
                companyName,
                companyAddress,
                companyLogoUrl,
                phoneNumber,
                email: companyEmail
            }
        });
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
    }
};
exports.updateAccount = updateAccount;
//# sourceMappingURL=providerController.js.map