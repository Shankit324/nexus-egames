// src/utils/api.js

const BASE_URL = 'https://nexus-egames.onrender.com';

export const apiFetch = async (endpoint, options = {}) => {
    // 1. Ensure the URL is correctly formed
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    
    let accessToken = localStorage.getItem('access_token');

    // 2. Automatically set headers (CRUCIAL: Added Content-Type back in)
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    };

    let response = await fetch(url, {
        ...options,
        headers
    });

    // 3. Handle 401 Unauthorized (Token Expired)
    if (response.status === 401) {
        const refreshToken = localStorage.getItem('refresh_token');

        if (refreshToken) {
            try {
                // Attempt to get a new access token
                const refreshResponse = await fetch(`${BASE_URL}/api/token/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: refreshToken })
                });

                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    
                    // Save the new tokens
                    localStorage.setItem('access_token', data.access);
                    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);

                    // Retry the original request with the NEW access token
                    headers['Authorization'] = `Bearer ${data.access}`;
                    
                    response = await fetch(url, {
                        ...options,
                        headers
                    });

                    return response; // Return the successful retry
                }
            } catch (error) {
                console.error("Token refresh failed", error);
            }
        }
        
        // 4. If we reach here, the refresh token is also expired or invalid.
        // Clear storage and redirect to login/home instead of a hard reload
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/'; 
        return response;
    }

    // 5. Protect against HTML error pages crashing the JSON parser (From our previous fix!)
    const contentType = response.headers.get("content-type");
    if (!response.ok && contentType && contentType.indexOf("text/html") !== -1) {
        console.error("Server returned HTML instead of JSON. Check backend URL or route.");
    }

    return response;
};