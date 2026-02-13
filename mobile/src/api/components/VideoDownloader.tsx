import React, { useState } from 'react';
import { downloadFileToPhone } from '../client';
import * as FileSystem from 'expo-file-system';
 
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
    Dimensions,
} from 'react-native';
import { getVideoInfo, downloadVideo } from '../client';

interface Format {
    format_id: string;
    ext: string;
    quality: string;
    format_type: string;
    filesize?: number;
    abr?: number;
    vbr?: number;
}

interface VideoInfo {
    title: string;
    uploader: string;
    duration: number;
    thumbnail: string;
    description?: string;
    view_count?: number;
    upload_date?: string;
    formats: Format[];
}

const { width } = Dimensions.get('window');

export default function VideoDownloader() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<Format | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isTransferring, setIsTransferring] = useState(false);

    const fetchInfo = async () => {
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            Alert.alert('Error', 'Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        setVideoInfo(null);
        try {
            const info = await getVideoInfo(url);
            setVideoInfo(info);
            // Auto-select best format (video+audio with highest quality)
            const bestFormat = info.formats.find((f: Format) =>
                f.format_type === 'video+audio'
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
        if (!selectedFormat || !videoInfo) return;

        setLoading(true);
        setDownloadProgress(0);

        try {
            // Step 1: Download to server
            const result = await downloadVideo(url, selectedFormat.format_id);

            // Step 2: Transfer to phone
            setIsTransferring(true);
            setLoading(false);

            const fileResult = await downloadFileToPhone(
                result.filename,
                videoInfo.title,
                (progress: number) => setDownloadProgress(progress)
            );

            Alert.alert(
                'Download Complete!',
                `"${videoInfo.title}" has been saved to your phone's Downloads folder in "YouTube Downloads" album.`,
                [{ text: 'OK' }]
            );

            setIsTransferring(false);
            setDownloadProgress(0);

        } catch (error) {
            setIsTransferring(false);
            setLoading(false);
            const errorMessage = error instanceof Error ? error.message : 'Download failed';
            Alert.alert('Error', errorMessage);
            console.error(error);
        }
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown size';
        const mb = bytes / 1024 / 1024;
        if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${mb.toFixed(1)} MB`;
    };

    const formatViewCount = (count?: number) => {
        if (!count) return '';
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
        return `${count} views`;
    };

    const getFormatIcon = (formatType: string) => {
        switch (formatType) {
            case 'video+audio': return '🎬';
            case 'video only': return '📹';
            case 'audio only': return '🎵';
            default: return '📄';
        }
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
                <View style={styles.formatLeft}>
                    <Text style={styles.formatIcon}>{getFormatIcon(item.format_type)}</Text>
                    <View>
                        <Text style={styles.formatQuality}>{item.quality}</Text>
                        <Text style={styles.formatType}>{item.format_type}</Text>
                    </View>
                </View>
                <Text style={styles.formatExt}>{item.ext.toUpperCase()}</Text>
            </View>
            <View style={styles.formatDetails}>
                <Text style={styles.formatSize}>📦 {formatFileSize(item.filesize)}</Text>
                {item.abr && <Text style={styles.formatBitrate}>🔊 {item.abr}kbps</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.headerTitle}>🎵 YouTube Downloader</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Paste YouTube URL here..."
                    placeholderTextColor="#666"
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
                    <Text style={styles.buttonText}>
                        {loading ? 'Loading...' : 'Get Info'}
                    </Text>
                </TouchableOpacity>
            </View>

            {loading && !videoInfo && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF6B6B" />
                    <Text style={styles.loadingText}>Fetching video info...</Text>
                </View>
            )}

            {videoInfo && (
                <View style={styles.contentContainer}>
                    {/* Thumbnail Section */}
                    <View style={styles.thumbnailContainer}>
                        <Image
                            source={{ uri: videoInfo.thumbnail }}
                            style={styles.thumbnail}
                            resizeMode="cover"
                        />
                        <View style={styles.durationBadge}>
                            <Text style={styles.durationText}>
                                {formatDuration(videoInfo.duration)}
                            </Text>
                        </View>
                    </View>

                    {/* Title & Info Section */}
                    <View style={styles.infoSection}>
                        <Text style={styles.title} numberOfLines={2}>
                            {videoInfo.title}
                        </Text>

                        <View style={styles.metaRow}>
                            <Text style={styles.uploader}>👤 {videoInfo.uploader}</Text>
                            {videoInfo.view_count && (
                                <Text style={styles.viewCount}>
                                    👁️ {formatViewCount(videoInfo.view_count)}
                                </Text>
                            )}
                        </View>

                        {videoInfo.description && (
                            <Text style={styles.description} numberOfLines={3}>
                                {videoInfo.description}
                            </Text>
                        )}
                    </View>

                    {/* Formats Section */}
                    <View style={styles.formatsSection}>
                        <Text style={styles.sectionTitle}>📋 Select Quality:</Text>
                        <FlatList
                            data={videoInfo.formats}
                            renderItem={renderFormatItem}
                            keyExtractor={(item) => item.format_id}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                        />
                    </View>

                    {/* Download Button */}
                    <TouchableOpacity
                        style={[styles.button, styles.downloadButton, loading && styles.disabledButton]}
                        onPress={handleDownload}
                        disabled={loading}
                    >
                        <Text style={styles.downloadButtonText}>
                            ⬇️ Download {selectedFormat?.quality} ({selectedFormat?.ext.toUpperCase()})
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
        backgroundColor: '#0f0f0f',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 60,
        marginBottom: 20,
        marginHorizontal: 20,
        textAlign: 'center',
    },
    inputContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },
    input: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 12,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    button: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    fetchButton: {
        backgroundColor: '#FF6B6B',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    loadingText: {
        color: '#999',
        marginTop: 12,
        fontSize: 14,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    thumbnailContainer: {
        position: 'relative',
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: width * 0.56, // 16:9 aspect ratio
        backgroundColor: '#1a1a1a',
    },
    durationBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    durationText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    infoSection: {
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
        lineHeight: 26,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 16,
    },
    uploader: {
        color: '#FF6B6B',
        fontSize: 14,
        fontWeight: '600',
    },
    viewCount: {
        color: '#999',
        fontSize: 14,
    },
    description: {
        color: '#aaa',
        fontSize: 14,
        lineHeight: 20,
    },
    formatsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    formatItem: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedFormat: {
        borderColor: '#FF6B6B',
        backgroundColor: '#2a1f1f',
    },
    formatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    formatLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    formatIcon: {
        fontSize: 24,
    },
    formatQuality: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    formatType: {
        color: '#999',
        fontSize: 12,
        marginTop: 2,
    },
    formatExt: {
        color: '#FF6B6B',
        fontWeight: 'bold',
        fontSize: 14,
        backgroundColor: '#2a1f1f',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    formatDetails: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 4,
    },
    formatSize: {
        color: '#aaa',
        fontSize: 13,
    },
    formatBitrate: {
        color: '#aaa',
        fontSize: 13,
    },
    downloadButton: {
        backgroundColor: '#4ECDC4',
        marginTop: 8,
    },
    downloadButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.6,
    },
    transferContainer: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    transferText: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 12,
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#333',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4ECDC4',
    },
    progressText: {
        color: '#999',
        marginTop: 8,
        fontSize: 14,
    },

});
