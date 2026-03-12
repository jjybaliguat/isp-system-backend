interface EmailSettings {
    enabled: boolean,
    emailHost?: string,
    emailPort?: number,
    emailUser?: string,
    emailPass?: string,
    senderName?: string,
    paymentConfirmationTemplate?: string,
}

export const emailIsConfigured = (settings: EmailSettings | undefined): boolean => {
    return !!(settings?.enabled && settings.emailHost && settings.emailPort && settings.emailUser && settings.emailPass && settings.senderName);
}