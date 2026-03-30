import axios from "axios";

export async function sendTelegramMessage(message: string, botToken: string, chatId: string) {
  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }
    );
    return res
  } catch (error) {
    console.error("Telegram error:", error);
  }
}