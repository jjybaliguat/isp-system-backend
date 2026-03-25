import { Request, Response } from 'express';
import { registerTenantJobs, unregisterTenantJobs } from '../../jobs/jobManager';
import { PrismaClient } from "@prisma/client";
import prisma from '../../utils/prisma';

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

export const updatePaymentOptions = async(req: Request, res: Response) => {
  const {id, providerId} = req.user
  const {paymentOptions} = req.body as {paymentOptions: {paymentProvider: string, accName: string, accNum: string, qrCodeUrl: string}[]}
  
  // if(!paymentOptions || paymentOptions.length == 0) return res.status(400).json({message: "Missing required fields"})
  try {
    const user = await prisma.user.findUnique({
      where: {
        id
      },
      select: {
        role: true
      }
    })

    if(user?.role !== "SUPERADMIN") return res.status(403).json({message: "Forbidden: unable to perform the operation"})

      // delete all paymentOptions belongs to this provider
    await prisma.otherPaymentOptions.deleteMany({
      where: {
        providerId
      }
    })

    const otherPaymentOption = await prisma.otherPaymentOptions.createMany({
      data: paymentOptions.map((p)=>{
        return {
          ...p,
          providerId
        }
      })
    })

    return res.status(200).json(otherPaymentOption)
  } catch (error) {
    console.log(error)
    res.status(500).json({message: "Internal Server Error"})
  }
}

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

export const updateBackupSettings = async(req: Request, res: Response) => {
  const {providerId} = req.user as {providerId: string}
  const {enabled, backUpEmail} = req.body

  try {
    const updateProvider = await prisma.provider.update({
      where: {
        id: providerId
      },
      data: {
        dailyBackup: enabled,
        backUpEmail
      }
    })

    return res.status(200).json(updateProvider)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Internal server error" });
  }
}
