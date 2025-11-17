import nodemailer from "nodemailer";
const marked: any = require("marked");

interface PaymentConfirmationProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptUrl: string
}

interface EmailCredentialProps {
  emailHost: string
  emailPass: string
  emailUser: string
  emailPort: number
  senderName: string
}

export async function sendPaymentConfirmation(
  templateMd: string,
  emailCredentials: EmailCredentialProps,
  recipient: string,
  subject: string,
  data: PaymentConfirmationProps
) {
  try {
    let compiledMd = templateMd;
    for (const key of Object.keys(data) as Array<keyof PaymentConfirmationProps>) {
      const value = String(data[key]);
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      compiledMd = compiledMd.replace(regex, value);
    }
    const htmlBody: string = await marked.parse(compiledMd);

    const transporter = nodemailer.createTransport({
      host: emailCredentials.emailHost,
      port: emailCredentials.emailPort || 465,
      secure: process.env.NODE_ENV === "production" ? true : false,
      auth: {
        user: emailCredentials.emailUser,
        pass: emailCredentials.emailPass,
      },
    });

    await transporter.sendMail({
      from: `${emailCredentials.senderName} <${emailCredentials.emailUser}>`,
      to: recipient,
      subject,
      html: htmlBody,
    });

    console.log("✅ Email sent successfully to", recipient);
  } catch (error: any) {
    console.error("❌ Failed to send email:", error);
    return error
  }
}
