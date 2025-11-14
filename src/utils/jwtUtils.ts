import jwt, { SignOptions } from "jsonwebtoken";

/**
 * Generates a signed JWT token.
 * 
 * @param payload - The data you want to include inside the token.
 * @param expiresIn - Expiration time (e.g. "1h", "7d", or 3600 seconds).
 * @returns A signed JWT string.
 * @throws If JWT_SECRET is missing or signing fails.
 */
export const generateToken = (
  payload: Record<string, any>,
  expiresIn: number
): string => {
  const secret = process.env.ACESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  const options: SignOptions = { expiresIn: `${expiresIn}min` };

  try {
    return jwt.sign(payload, secret, options);
  } catch (err) {
    console.error("Error generating JWT:", err);
    throw new Error("Failed to generate token");
  }
};
