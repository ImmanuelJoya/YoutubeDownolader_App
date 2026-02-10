import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    ScrollView,
} from 'react-native';
import { getVideoInfo, downloadVideo } from '../client';

interface Format {
    format_id: string;
    ext: string;
    quality: string;
    filesize?: number;
    vcodec: string | null;
    acodec: string | null;
}

interface VideoInfo {
    title: string;
    duration: number;
    thumbnail: string;
    uploader: string;
    formats: Format[];
}

export default function VideoDownloader() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<Format | null>(null);

    const fetchInfo = async () => {
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            Alert.alert('Error', 'Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        try {
            const info = await getVideoInfo(url);
            setVideoInfo(info);
            // Auto-select best quality (video+audio)
            const bestFormat = info.formats.find((f: Format) =>
                f.vcodec !== 'none' && f.acodec !== 'none'
            ) || info.formats[0];
            setSelectedFormat(bestFormat);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch video info. Check server connection.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!selectedFormat) return;

        setLoading(true);
        try {
            const result = await downloadVideo(url, selectedFormat.format_id);
            Alert.alert(
                '✅ Download Complete',
                `File saved on server: ${result.filename}\n\nNext: Transfer to phone storage`
            );
        } catch (error) {
            Alert.alert('❌ Error', 'Download failed. Check server logs.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const renderFormatItem = ({ item }: { item: Format }) => (
        <TouchableOpacity
            style={[
                styles.formatItem,
                selectedFormat?.format_id === item.format_id && styles.selectedFormat
            ]}
            onPress={() => setSelectedFormat(item)}
        >
            <View style={styles.formatHeader}>
                <Text style={styles.formatQuality}>{item.quality}</Text>
                <Text style={styles.formatExt}>{item.ext.toUpperCase()}</Text>
            </View>
            <Text style={styles.formatDetails}>
                {item.filesize ? `${(item.filesize / 1024 / 1024).toFixed(1)} MB` : 'Size unknown'}
                {item.vcodec === 'none' ? ' • Audio only' : ''}
                {item.acodec === 'none' ? ' • Video only' : ''}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>🎵 YouTube Downloader</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Paste YouTube URL here..."
                    placeholderTextColor="#999"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                />
                <TouchableOpacity
                    style={[styles.button, styles.fetchButton]}
                    onPress={fetchInfo}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Get Info</Text>
                </TouchableOpacity>
            </View>

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Processing...</Text>
                </View>
            )}

            {videoInfo && (
                <View style={styles.infoContainer}>
                    <Image
                        source={{ uri: videoInfo.thumbnail }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />

                    <View style={styles.videoDetails}>
                        <Text style={styles.videoTitle} numberOfLines={2}>
                            {videoInfo.title}
                        </Text>
                        <Text style={styles.videoMeta}>
                            {videoInfo.uploader} • {formatDuration(videoInfo.duration)}
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>Select Quality:</Text>
                    <FlatList
                        data={videoInfo.formats.slice(0, 15)} // Limit to first 15 formats
                        renderItem={renderFormatItem}
                        keyExtractor={(item) => item.format_id}
                        scrollEnabled={false}
                    />

                    <TouchableOpacity
                        style={[styles.button, styles.downloadButton, loading && styles.disabledButton]}
                        onPress={handleDownload}
                        disabled={loading}
                    >
                        <Text style={styles.downloadButtonText}>
                            ⬇️ Download {selectedFormat?.quality}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        marginTop: 40,
        textAlign: 'center',
    },
    inputContainer: {
        gap: 10,
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#1E1E1E',
        padding: 15,
        borderRadius: 12,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    button: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    fetchButton: {
        backgroundColor: '#007AFF',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingContainer: {
        alignItems: 'center',
        marginTop: 30,
    },
    loadingText: {
        color: '#999',
        marginTop: 10,
    },
    infoContainer: {
        marginTop: 10,
    },
    thumbnail: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 15,
    },
    videoDetails: {
        marginBottom: 20,
    },
    videoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    videoMeta: {
        color: '#999',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 10,
    },
    formatItem: {
        backgroundColor: '#1E1E1E',
        padding: 15,
        marginBottom: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedFormat: {
        borderColor: '#007AFF',
        backgroundColor: '#1a3a5c',
    },
    formatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    formatQuality: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    formatExt: {
        color: '#007AFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    formatDetails: {
        color: '#999',
        fontSize: 13,
    },
    downloadButton: {
        backgroundColor: '#34C759',
        marginTop: 20,
        marginBottom: 40,
    },
    downloadButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    disabledButton: {
        opacity: 0.6,
    },
});