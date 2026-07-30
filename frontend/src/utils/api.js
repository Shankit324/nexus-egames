// src/utils/api.js

export const apiFetch = async (endpoint, options = {}) => {
    let accessToken = localStorage.getItem('access_token');

    // Automatically set the Authorization header if a token exists
    const headers = {
        ...options.headers,
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    };

    let response = await fetch(`https://nexus-egames.onrender.com${endpoint}`, {
        ...options,
        headers
    });

    // If the request fails with 401 Unauthorized, the access token is likely expired
    if (response.status === 401) {
        const refreshToken = localStorage.getItem('refresh_token');

        if (refreshToken) {
            try {
                // Attempt to get a new access token
                const refreshResponse = await fetch('https://nexus-egames.onrender.com/api/token/refresh/', {
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
                    
                    return await fetch(`https://nexus-egames.onrender.com${endpoint}`, {
                        ...options,
                        headers
                    });
                }
            } catch (error) {
                console.error("Token refresh failed", error);
            }
        }
        
        // If we reach here, the refresh token is also expired or invalid.
        // Force logout by clearing storage and reloading the app.
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.reload(); 
    }

    return response;
};