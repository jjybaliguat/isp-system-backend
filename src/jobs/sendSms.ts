interface VariableProps {
  name?: string;
  amount?: string;
  accNum?: string;
  dueDate?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  link?: string;
  websiteLink?: string;
  period?: string;
  password?: string
  billingDay?: string;
}

export async function sendSms(phoneNumber: string, template: string, data: VariableProps, apiKey: string){
    try {
        let message = template;
        for (const key of Object.keys(data) as Array<keyof VariableProps>) {
            const value = String(data[key]);
            const regex = new RegExp(`{\\s*${key}\\s*}`, "g");
            message = message.replace(regex, value);
        }

        const response: any = await fetch(`https://api.semaphore.co/api/v4/messages?apikey=${apiKey}&number=${phoneNumber}&message=${message}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        })

        const responseData = await response.json()

        return responseData
    } catch (error) {
        console.error("Error sending SMS:", error);
        return null;
    }
}