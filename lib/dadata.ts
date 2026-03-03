export interface DaDataSuggestion {
    value: string;
    unrestricted_value: string;
    data: any;
}

export async function suggestAddress(query: string, count: number = 5): Promise<DaDataSuggestion[]> {
    const apiKey = process.env.DADATA_API_KEY;

    if (!apiKey) {
        console.warn('DADATA_API_KEY is not defined. Returning empty suggestions.');
        return [];
    }

    try {
        const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Token ${apiKey}`
            },
            body: JSON.stringify({ query, count })
        });

        if (!response.ok) {
            console.error(`DaData API Error: ${response.status} ${response.statusText}`);
            return [];
        }

        const json = await response.json();
        return json.suggestions || [];
    } catch (error) {
        console.error('DaData Fetch Error:', error);
        return [];
    }
}
