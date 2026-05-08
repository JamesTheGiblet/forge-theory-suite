/// <reference types="vite/client" />

// Add custom type definitions for ImportMetaEnv
interface ImportMetaEnv {
    VITE_PRAXIMOUS_API_KEY: string;
    // add other env variables here if needed
}

// Augment the global ImportMeta type so TypeScript recognizes 'env'
declare global {
    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

const API_BASE_URL = '/api/v1';
const API_KEY = import.meta.env.VITE_PRAXIMOUS_API_KEY;

/**
 * A wrapper around the native fetch API that automatically handles:
 * 1. Prepending the API base URL.
 * 2. Adding the API key to the headers for authentication.
 * 3. Parsing the response as JSON.
 * 4. Standardizing error handling.
 *
 * @param endpoint The API endpoint to call (e.g., '/system-status').
 * @param options Optional fetch options (method, body, etc.).
 * @returns A promise that resolves with the JSON response data.
 * @throws An error with a detailed message if the fetch fails or the response is not ok.
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (API_KEY) {
        headers.set('X-API-Key', API_KEY);
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    const response = await fetch(url, config);

    const responseText = await response.text();

    if (!response.ok) {
        let errorDetail = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errorJson = JSON.parse(responseText);
            errorDetail = errorJson.detail || JSON.stringify(errorJson);
        } catch (e) {
            errorDetail = responseText || errorDetail;
        }
        throw new Error(errorDetail);
    }

    return responseText ? JSON.parse(responseText) : ({} as T);
}