import { PrismaClient } from "@prisma/client";
// import keys from "../wg-keys.json"; // adjust path if needed
import { encrypt } from "../src/utils/hasher"; // adjust path if needed

const prisma = new PrismaClient();

async function main() {
  // for (const key of keys) {
  //   const encryptedPrivateKey = encrypt(key.privateKey);
  //   await prisma.wireguardKeys.create({
  //     data: {
  //       publicKey: key.publicKey,
  //       privateKey: encryptedPrivateKey,
  //       assignedIp: key.assignedIp,
  //     },
  //   });
  // }

  // console.log(`Seeded ${keys.length} WireGuard keys`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });