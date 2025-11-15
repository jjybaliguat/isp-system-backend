import { Request, Response } from 'express';
import { registerTenantJobs, unregisterTenantJobs } from '../../jobs/jobManager';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const updateNotificationsSettings = async (req: Request, res: Response) => {
  const { enabled, emailUser, emailPass, emailHost, emailPort, senderName, invoiceReminderTemplate, paymentConfirmationTemplate, overdueNoticeTemplate } = req.body;
  const { providerId } = req.user;

  try {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { settings: true },
    });

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }
    const currentSettings =
      typeof provider.settings === "object" && provider.settings !== null
        ? provider.settings
        : {};

    const updatedSettings = {
      ...(currentSettings as Record<string, any>),
      notifications: {
        ...(currentSettings as any)?.notifications,
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

    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: {
        settings: updatedSettings,
      },
    });

    return res.status(200).json(updatedProvider);
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePaymentSettings = async (req: Request, res: Response) => {
  const { latePaymentGracePeriod} = req.body;
  const { providerId } = req.user;

  try {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { settings: true },
    });

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }
    const currentSettings =
      typeof provider.settings === "object" && provider.settings !== null
        ? provider.settings
        : {};

    const updatedSettings = {
      ...(currentSettings as Record<string, any>),
      payment: {
        ...(currentSettings as any)?.payment,
        latePaymentGracePeriod
      },
    };

    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: {
        settings: updatedSettings,
      },
    });

    return res.status(200).json(updatedProvider);
  } catch (error) {
    console.error("Error updating payment settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateBillingSettings = async (req: Request, res: Response) => {
  const { 
    autoInvoicing,
    invoiceGenerationDaysBeforeDue,
    sendInvoiceReminderDaysBeforeDue,
    } = req.body;
  const { providerId } = req.user;

  try {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { name: true, settings: true },
    });

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }
    const currentSettings =
      typeof provider.settings === "object" && provider.settings !== null
        ? provider.settings
        : {};

    const updatedSettings = {
      ...(currentSettings as Record<string, any>),
      billing: {
        ...(currentSettings as any)?.billing,
        autoInvoicing,
        invoiceGenerationDaysBeforeDue,
        sendInvoiceReminderDaysBeforeDue,
      },
    };

    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: {
        settings: updatedSettings,
      },
    });

    if(autoInvoicing) {
      await registerTenantJobs(providerId, provider.name);
    }else{
      await unregisterTenantJobs(providerId)
    }

    return res.status(200).json(updatedProvider);
  } catch (error) {
    console.error("Error updating billing settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateDocumentsSettings = async (req: Request, res: Response) => {
  const { 
    numberPrefix,
    // startingNumber,
    // includeTax,
    // taxRate,
    companyLogoUrl,
    footerMessage
    } = req.body;
  const { providerId } = req.user;

  try {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { settings: true },
    });

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }
    const currentSettings =
      typeof provider.settings === "object" && provider.settings !== null
        ? provider.settings
        : {};

    const updatedSettings = {
      ...(currentSettings as Record<string, any>),
      invoiceDocument: {
        ...(currentSettings as any)?.invoiceDocument,
        numberPrefix,
        companyLogoUrl,
        footerMessage
      },
    };

    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: {
        settings: updatedSettings,
      },
    });

    return res.status(200).json(updatedProvider);
  } catch (error) {
    console.error("Error updating documents settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
