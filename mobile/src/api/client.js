import axios from 'axios';

// IMPORTANT: Replace with your computer's local IP when testing on phone
// Find your IP: Windows (ipconfig), Mac/Linux (ifconfig)
const API_BASE_URL = 'http://169.254.188.86/16';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds for video processing
});

export const getVideoInfo = async (url) => {
    const response = await api.get('/info', { params: { url } });
    return response.data;
};

export const downloadVideo = async (url, formatId) => {
    const response = await api.post('/download', null, {
        params: { url, format_id: formatId },
    });
    return response.data;
};

export default api;