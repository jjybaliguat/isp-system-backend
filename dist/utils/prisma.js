"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// prisma.ts
const client_1 = require("@prisma/client");
let prisma;
if (process.env.NODE_ENV === "production") {
    prisma = new client_1.PrismaClient();
}
else {
    // Avoid multiple instances in dev with hot reload
    if (!global.prisma) {
        global.prisma = new client_1.PrismaClient();
    }
    prisma = global.prisma;
}
exports.default = prisma;
//# sourceMappingURL=prisma.js.map