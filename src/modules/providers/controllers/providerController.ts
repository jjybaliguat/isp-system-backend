import e, { Request, Response } from 'express';
import { validate as isUuid } from "uuid";
import fs from 'fs';
import path from 'path';
import { ProviderType, UserRole } from '@prisma/client';
import { decrypt, encrypt } from '../../../utils/hasher';
import Xendit from 'xendit-node';
import bcrypt from "bcryptjs";
import prisma from '../../../utils/prisma';

export const getProvider = async (req: Request, res: Response) => {
    const {providerId} = req.user
    try {
        const provider = await prisma.provider.findUnique({
            where: {
                id: providerId
            },
            include: {
                otherPaymentOptions: true
            }
        });

        res.status(200).json(provider);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const getOtherPaymentOptions = async(req: Request, res: Response) => {
    const {providerId} = req.user
    try {
        const paymentOptions = await prisma.otherPaymentOptions.findMany({
            where: {
                providerId
            }
        })

        return res.status(200).json(paymentOptions)
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const getProviders = async (req: Request, res: Response) => {
    const {providerId} = req.user
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const branchStatus =
    typeof req.query.status === "string" && req.query.status !== "All"
      ? req.query.status
      : undefined;
    
    if (!providerId) {
        return res.status(401).json({ message: "Provider ID not found in token" });
    }

    const skip = (page - 1) * limit;

    try {
        const whereClause: any = {
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
            prisma.provider.findMany({
                where: whereClause,
                include: {
                    branches: true,
                    clients: true
                }
            }),
            prisma.provider.count({where: whereClause})
        ])
        return res.status(200).json({
            data: providers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const getProvidersWithFilteredResponse = async (
  req: Request,
  res: Response
) => {
  try {
    const provider = await prisma.provider.findFirst({
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch provider' });
  }
};

export const getProviderById = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }

    try {
        const provider = await prisma.provider.findUnique({
            where: {
                id
            }
        })

        if(!provider)
            return res.status(404).json({
                message: 'Provider not found'
            })

        res.status(200).json(provider)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}
export const createProvider = async (req: Request, res: Response) => {
    const {
        name,
        companyName,
        companyAddress,
        email,
        phoneNumber
    } = req.body;
    const {providerId} = req.user

    const requiredFields: Record<string, unknown> = {name, companyName, companyAddress, email, phoneNumber};

    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => value === undefined || value === null || value === '')
        .map(([key]) => key)

    if(missingFields.length > 0) {
        const errors: Record<string, string> = {};

        missingFields.forEach(field => {
            errors[field] = `${field} is required`;
        })

        return res.status(400).json({ ...errors });
    }


    try {
        const existingProvider = await prisma.provider.findUnique({
            where: { email }
        })
        if(existingProvider) {
            return res.status(409).json({ message: 'Provider with this email already exists' });
        }
        
        const newProvider = await prisma.provider.create({
            data: {
                ...req.body,
                parentProviderId: providerId,
                providerType: ProviderType.BRANCH
            }
        })
        const hashedPassword = await bcrypt.hash("admin123456", 10);
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName: name,
                role: "SUPERADMIN",
                providerId: newProvider.id
            }
        })

        return res.status(201).json(newProvider);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
export const updateProvider = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const {
        name,
        companyName,
        companyAddress,
        email,
        phoneNumber
    } = req.body
    
     if (!isUuid(id)) {
        return res.status(400).json({ message: "Invalid provider ID format" });
    }

    try {
        const existingProvider = await prisma.provider.findUnique({
            where: { id }
        })

        if(!existingProvider) {
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
        })

        return res.status(200).json(updatedProvider);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
export const deleteProvider = async (req: Request, res: Response) => {
    const  { id } = req.params as { id: string }
    const {providerId} = req.user

    if( !isUuid(id)) {
        return res.status(400).json({ message: 'Invalid provider ID format' })
    }
    
    try {
        await prisma.provider.delete({
            where: {
                id,
                parentProviderId: providerId
            }
        })

        res.status(204).send();
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

export const updateXenditKey = async (req: Request, res: Response) => {
  const { apiKey, convenienceFee, expiration } = req.body;
  const { providerId, role } = req.user;

  if (role !== UserRole.SUPERADMIN) {
    return res.status(403).json({
      message: "You are not allowed to perform this operation",
    });
  }

  try {
    const data: any = {};

    if (apiKey && apiKey.trim() !== "") {
      data.xenditApiKey = encrypt(apiKey);
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

    await prisma.provider.update({
      where: { id: providerId },
      data,
    });

    return res.status(200).json({
      message: "Xendit settings updated successfully",
    });
  } catch (error) {
    console.error("updateXenditKey error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const updateSemaphoreKey = async(req: Request, res: Response) => {
    const {key} = req.body
    const {providerId, role} = req.user
    
    if(role !== UserRole.SUPERADMIN) return res.status(401).json({message: "You are not allowed to perform this operation"})

    try {
        const encryptedKey = encrypt(key)
        const newKey = await prisma.provider.update({
            where: {
                id: providerId
            },
            data: {
                semaphoreApiKey: encryptedKey
            }
        })
        
        return res.status(200).json(newKey.semaphoreApiKey)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

export const getStoredKey = async(req: Request, res: Response) => {
    const {providerId} = req.user

    try {
        const provider = await prisma.provider.findUnique({
            where: {
                id: providerId
            },
            select: {
                xenditApiKey: true,
                semaphoreApiKey: true,
                paymentConvenienceFee: true,
                invoiceDurationDays: true
            }
        })

        return res.status(200).json({
            xendit: {
                apiKey: provider?.xenditApiKey,
                convenienceFee: provider?.paymentConvenienceFee,
                expiration: provider?.invoiceDurationDays
            }, 
            semaphoreApiKey: provider?.semaphoreApiKey})
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

export const testXenditConnection = async(req: Request, res: Response) => {
    try {
        const xenditKey = req.xenditKey
    
        const xenditClient = new Xendit({
          secretKey: xenditKey!,
        })
    
        const { Invoice } = xenditClient;

        await Invoice.getInvoices()
        return res.status(200).json({message: "Connection Succeeded"})
    } catch (error: any) {
        console.log(error.response.message)
        res.status(500).json({ message: error.response.message })
    }
}

export const testSemaphoreConnection = async(req: Request, res: Response) => {
    try {
        const smsKey = req.smsKey
    
        const response = await fetch(`https://api.semaphore.co/api/v4/messages?apikey=${smsKey}&limit=5`)

        const data: any = await response.json()

        if(data.apikey){
            return res.status(400).json({message: data.apikey[0]})
        }

        return res.status(200).json({message: "Connection Succeeded"})
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

export const updateAccount = async(req: Request, res: Response) => {
    const {
        userId,
        fullName,
        email,
        companyEmail,
        companyName,
        companyAddress,
        phoneNumber
    } = req.body
    const {providerId} = req.user

    try {
        // update user first
        const updatedUser = await prisma.user.update({
            where: {
                id: userId,
                providerId
            },
            data: {
                fullName,
                email
            }
        })

        // perform provider update
        const updatedProvider = await prisma.provider.update({
            where: {
                id: providerId
            },
            data: {
                companyName,
                companyAddress,
                phoneNumber,
                email: companyEmail
            }
        })

        // If logo changed and previous logo is a local uploads file, attempt to delete the old file

        const returnData = {
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            companyEmail: updatedProvider.email,
            companyName: updatedProvider.companyName,
            companyAddress: updatedProvider.companyAddress,
            phoneNumber: updatedProvider.phoneNumber,
            companyLogoUrl: updatedProvider.companyLogoUrl
        }

        return res.status(200).json(returnData)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

// Upload provider logo handler
export const uploadProviderLogo = async (req: Request, res: Response) => {
    try {
        const { providerId } = req.user as any;

        if (!providerId) {
            return res.status(401).json({ message: 'Provider not authenticated' });
        }

        // multer should have populated req.file
        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // determine folder name from destination
        const destination = file.destination || '';
        const folderName = destination ? path.basename(destination) : '';

        // Force https in production so returned URLs are secure. When developing locally, use req.protocol.
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;

        const fileUrl = `${protocol}://${req.get('host')}/uploads/${folderName}/${file.filename}`;


        // update provider with new logo url and delete old if needed
        const existingProvider = await prisma.provider.findUnique({ where: { id: providerId }, select: { companyLogoUrl: true } });

        const updatedProvider = await prisma.provider.update({ where: { id: providerId }, data: { companyLogoUrl: fileUrl } });

        // delete old file if it was local and different
        try {
            if (existingProvider?.companyLogoUrl && existingProvider.companyLogoUrl !== fileUrl && existingProvider.companyLogoUrl.includes('/uploads/')) {
                const uploadsRoot = path.resolve(__dirname, "../../../../uploads");
                const idx = existingProvider.companyLogoUrl.indexOf('/uploads/');
                const relPath = existingProvider.companyLogoUrl.substring(idx + '/uploads/'.length);
                const filePath = path.join(
                    uploadsRoot,
                    relPath.replace(/\//g, path.sep)
                );
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (delErr) {
            console.error('Failed to delete previous logo after upload:', delErr);
        }

        return res.status(200).json({ url: fileUrl, provider: { id: updatedProvider.id, companyLogoUrl: updatedProvider.companyLogoUrl } });
    } catch (error) {
        console.error('uploadProviderLogo error', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const createSmsIntegrationSettings = async(req: Request, res: Response) => {
    const {
        sendWhenBillIsMade,
        sendWhenBillIsDue,
        sendWhenPaymentIsMade,
        sendWhenCustomerAdded,
        sendDaysBeforeDue,
        sendWhenBillIsMadeTemplate,
        sendWhenBillIsDueTemplate,
        sendWhenPaymentIsMadeTemplate,
        sendWhenCustomerAddedTemplate,
        sendDaysBeforeDueTemplate
    } = req.body

    const {providerId} = req.user

    try {
        const existingSettings = await prisma.smsIntegrationSettings.findUnique({
            where: {
                providerId
            }
        })
        if(existingSettings) {
            const updatedSettings = await prisma.smsIntegrationSettings.update({
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
            })
            return res.status(200).json(updatedSettings)
        }else{
            const settings = await prisma.smsIntegrationSettings.create({
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
            })
            return res.status(201).json(settings)
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

export const getSmsIntegrationSettings = async(req: Request, res: Response) => {
    const {providerId} = req.user
    try {
        const settings = await prisma.smsIntegrationSettings.findUnique({
            where: {
                providerId
            }
        })
        if(!settings) {
            return res.status(404).json({message: "SMS Integration Settings not found"})
        }
        return res.status(200).json(settings)
    }
    catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }   
}