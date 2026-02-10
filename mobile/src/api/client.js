import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy'; // Use legacy API
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const API_BASE_URL = 'http://10.0.0.173:8000';

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

// Download file to phone storage
export const downloadFileToPhone = async (filename, title, onProgress) => {
    try {
        // Create download URL
        const fileUrl = `${API_BASE_URL}/file/${encodeURIComponent(filename)}`;

        // Set up local file path (app's documents directory)
        const documentsDir = FileSystem.documentDirectory;
        const localUri = documentsDir + filename;

        // Check if file already exists and delete it
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(localUri);
        }

        // Download with progress tracking
        const downloadResumable = FileSystem.createDownloadResumable(
            fileUrl,
            localUri,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                onProgress?.(progress);
            }
        );

        const { uri } = await downloadResumable.downloadAsync();

        // Try to share/save the file (this will prompt user where to save)
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: getMimeType(filename),
                dialogTitle: `Save ${title}`,
                UTI: getUTI(filename)
            });
        }

        return { success: true, localUri: uri };
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
};

// Helper functions for file types
const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'm4a': 'audio/mp4',
        'mp3': 'audio/mpeg',
        'ogg': 'audio/ogg',
        'wav': 'audio/wav',
    };
    return types[ext] || 'application/octet-stream';
};

const getUTI = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const utis = {
        'mp4': 'public.mpeg-4',
        'm4a': 'public.mpeg-4-audio',
        'mp3': 'public.mp3',
    };
    return utis[ext] || 'public.data';
};

export default api;