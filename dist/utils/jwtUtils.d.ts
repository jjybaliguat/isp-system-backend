/**
 * Generates a signed JWT token.
 *
 * @param payload - The data you want to include inside the token.
 * @param expiresIn - Expiration time (e.g. "1h", "7d", or 3600 seconds).
 * @returns A signed JWT string.
 * @throws If JWT_SECRET is missing or signing fails.
 */
export declare const generateToken: (payload: Record<string, any>, expiresIn: number) => string;
//# sourceMappingURL=jwtUtils.d.ts.map