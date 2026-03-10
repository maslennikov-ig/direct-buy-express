import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyTelegramAuth, type TelegramAuthData } from '../lib/telegram-auth';

describe('telegram-auth', () => {
    const mockBotToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
    
    // Generate valid signature matching the backend implementation
    const generateValidHash = (data: Record<string, any>, token: string) => {
        const sortedData = Object.keys(data)
            .sort()
            .map(k => `${k}=${data[k]}`)
            .join('\n');
            
        const secretKey = crypto.createHash('sha256').update(token).digest();
        return crypto.createHmac('sha256', secretKey).update(sortedData).digest('hex');
    };

    it('should verify a valid telegram login payload', () => {
        const payloadWithoutHash = {
            id: 123456789,
            first_name: 'Test',
            username: 'testuser',
            auth_date: Math.floor(Date.now() / 1000) - 10, // 10 seconds ago
        };
        
        const hash = generateValidHash(payloadWithoutHash, mockBotToken);
        
        const validPayload: TelegramAuthData = {
            ...payloadWithoutHash,
            hash
        };
        
        expect(verifyTelegramAuth(validPayload, mockBotToken)).toBe(true);
    });
    
    it('should reject an invalid signature', () => {
        const validPayload: TelegramAuthData = {
            id: 123456789,
            first_name: 'Test',
            username: 'testuser',
            auth_date: Math.floor(Date.now() / 1000) - 10,
            hash: 'invalidhash1234567890abcdef',
        };
        
        expect(verifyTelegramAuth(validPayload, mockBotToken)).toBe(false);
    });
    
    it('should reject a payload older than 24 hours', () => {
        const payloadWithoutHash = {
            id: 123456789,
            first_name: 'Test',
            username: 'testuser',
            auth_date: Math.floor(Date.now() / 1000) - 90000, // > 24 hours ago
        };
        
        const hash = generateValidHash(payloadWithoutHash, mockBotToken);
        
        const expiredPayload: TelegramAuthData = {
            ...payloadWithoutHash,
            hash
        };
        
        expect(verifyTelegramAuth(expiredPayload, mockBotToken)).toBe(false);
    });
    
    it('should reject if required fields are missing', () => {
        const invalidPayload1 = { id: 123 } as any;
        expect(verifyTelegramAuth(invalidPayload1, mockBotToken)).toBe(false);
        
        const invalidPayload2 = { hash: 'yes' } as any;
        expect(verifyTelegramAuth(invalidPayload2, mockBotToken)).toBe(false);
    });
});
