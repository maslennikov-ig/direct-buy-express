import crypto from 'crypto';

export interface TelegramAuthData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

/**
 * Validates the data received from the Telegram Login Widget
 * https://core.telegram.org/widgets/login#checking-authorization
 * 
 * @param data The payload received from Telegram
 * @param botToken The bot token used for validation
 * @returns true if data is authentic and not expired
 */
export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
    if (!botToken || !data.hash || !data.auth_date) {
        return false;
    }

    // Check if the authorization isn't older than 24h to prevent replay attacks
    const now = Math.floor(Date.now() / 1000);
    if (now - data.auth_date > 86400) {
        return false;
    }

    // Extract copy of data without hash
    const authData: Record<string, any> = { ...data };
    delete authData.hash;

    // Format data check string: keys sorted alphabetically, joined by newline
    const dataCheckString = Object.keys(authData)
        .sort()
        .filter((key) => authData[key] !== undefined && authData[key] !== null)
        .map((key) => `${key}=${authData[key]}`)
        .join('\n');

    // Secret key is SHA256 hash of the bot token
    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // Calculate HMAC-SHA256 signature
    const hmac = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    return hmac === data.hash;
}
