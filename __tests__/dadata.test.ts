import { describe, expect, it, vi, beforeEach } from 'vitest';
import { suggestAddress } from '../lib/dadata';

// Mock the global fetch
global.fetch = vi.fn();

describe('DaData Integration Utility', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        process.env.DADATA_API_KEY = 'test_api_key';
    });

    it('should return a list of suggestions on success', async () => {
        const mockResponse = {
            suggestions: [
                { value: 'г Москва, ул Тверская', data: { fias_id: '123' } },
                { value: 'г Москва, ул Тверская-Ямская 1-я', data: { fias_id: '456' } }
            ]
        };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const suggestions = await suggestAddress('Тверская');

        expect(global.fetch).toHaveBeenCalledWith(
            'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Token test_api_key'
                }),
                body: JSON.stringify({ query: 'Тверская', count: 5 })
            })
        );

        expect(suggestions).toHaveLength(2);
        expect(suggestions[0].value).toBe('г Москва, ул Тверская');
    });

    it('should return an empty array if the API call fails', async () => {
        (global.fetch as any).mockRejectedValue(new Error('Network error'));

        const suggestions = await suggestAddress('Invalid');
        expect(suggestions).toEqual([]);
    });

    it('should handle non-ok responses', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 403
        });

        const suggestions = await suggestAddress('Forbidden');
        expect(suggestions).toEqual([]);
    });
});
