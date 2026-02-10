import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { getVideoInfo, downloadVideo } from './src/api/client';

export default function App() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoInfo, setVideoInfo] = useState(null);
    const [selectedFormat, setSelectedFormat] = useState(null);

    const fetchInfo = async () => {
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            Alert.alert('Error', 'Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        try {
            const info = await getVideoInfo(url);
            setVideoInfo(info);
            // Auto-select best quality
            const bestFormat = info.formats.find(f =>
                f.vcodec !== 'none' && f.acodec !== 'none'
            ) || info.formats[0];
            setSelectedFormat(bestFormat);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch video info');
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
                'Download Started',
                `File: ${result.filename}\n\nNote: File is on server. Next step: transfer to phone.`
            );
        } catch (error) {
            Alert.alert('Error', 'Download failed');
        } finally {
            setLoading(false);
        }
    };

    const renderFormatItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.formatItem,
                selectedFormat?.format_id === item.format_id && styles.selectedFormat
            ]}
            onPress={() => setSelectedFormat(item)}
        >
            <Text style={styles.formatText}>
                {item.quality} • {item.ext.toUpperCase()}
            </Text>
            <Text style={styles.formatSize}>
                {item.filesize ? (item.filesize / 1024 / 1024).toFixed(1) + ' MB' : 'Size unknown'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>YouTube Downloader</Text>

            <TextInput
                style={styles.input}
                placeholder="Paste YouTube URL here..."
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
            />

            <Button title="Get Video Info" onPress={fetchInfo} disabled={loading} />

            {loading && <ActivityIndicator style={styles.loader} size="large" />}

            {videoInfo && (
                <View style={styles.infoContainer}>
                    <Image
                        source={{ uri: videoInfo.thumbnail }}
                        style={styles.thumbnail}
                    />
                    <Text style={styles.videoTitle}>{videoInfo.title}</Text>
                    <Text style={styles.uploader}>{videoInfo.uploader}</Text>

                    <Text style={styles.sectionTitle}>Select Quality:</Text>
                    <FlatList
                        data={videoInfo.formats}
                        renderItem={renderFormatItem}
                        keyExtractor={(item) => item.format_id}
                        style={styles.formatList}
                    />

                    <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={handleDownload}
                    >
                        <Text style={styles.downloadText}>
                            Download {selectedFormat?.quality}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
        paddingTop: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    loader: {
        marginTop: 20,
    },
    infoContainer: {
        marginTop: 20,
    },
    thumbnail: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 10,
    },
    videoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    uploader: {
        color: '#666',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    formatList: {
        maxHeight: 200,
        marginBottom: 15,
    },
    formatItem: {
        backgroundColor: 'white',
        padding: 12,
        marginBottom: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    selectedFormat: {
        borderColor: '#007AFF',
        backgroundColor: '#E3F2FD',
    },
    formatText: {
        fontWeight: '500',
    },
    formatSize: {
        color: '#666',
        fontSize: 12,
    },
    downloadButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    downloadText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});