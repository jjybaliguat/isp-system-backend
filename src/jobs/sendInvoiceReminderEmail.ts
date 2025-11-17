import nodemailer from "nodemailer";
const marked: any = require("marked");

interface InvoiceReminderProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  paymentUrl: string;
  dueDate: string;
}

interface EmailCredentialProps {
  emailHost: string
  emailPass: string
  emailUser: string
  emailPort: number
  senderName: string
}

export async function sendInvoiceReminderEmail(
  templateMd: string,
  emailCredentials: EmailCredentialProps,
  recipient: string,
  subject: string,
  data: InvoiceReminderProps
) {
  try {
    let compiledMd = templateMd;
    for (const key of Object.keys(data) as Array<keyof InvoiceReminderProps>) {
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
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
}
