import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const logTransaction = async ({
  action,
  entity,
  userId,
  providerId,
  message
}: {
  action: string;
  entity: string;
  userId?: string | null;
  providerId?: string | null;
  message?: string;
}) => {
  try {
    await prisma.log.create({
      data: {
        action,
        entity,
        ...(userId ? { userId } : {}), // only include if defined
        ...(providerId ? { providerId } : {}), // only include if defined
        ...(message ? { message } : {}), // only include if defined
      },
    });
  } catch (error) {
    console.error("Failed to log transaction:", error);
  }
};
