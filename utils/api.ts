/**
 * Utility to provide the base API URL dynamically.
 * This ensures that when the app is accessed via an IP address (e.g. from another device),
 * the API calls are routed to the same host instead of hardcoded localhost.
 */
export const getApiBaseUrl = (): string => {
    // If the app is accessed via localhost, use localhost for API
    // If accessed via IP (like 10.16.86.176), use that IP for API.
    // The backend proxy port is assumed to be 3001 as per server/index.js
    const hostname = window.location.hostname;
    return `http://${hostname}:3001`;
};

export const API_ENDPOINTS = {
    STATUS: `${getApiBaseUrl()}/api/config/status`,
    KEY: `${getApiBaseUrl()}/api/config/key`,
    CHAT: `${getApiBaseUrl()}/api/chat`,
};
