import axios from 'axios';

const API_BASE_URL = 'http://169.254.188.86/16';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
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

export const downloadFileToPhone = async (filename, downloadUri) => {
    const response = await api.get(`/download-file/${filename}`, {
        responseType: 'blob',
    });
    return response.data;
};

export default api;