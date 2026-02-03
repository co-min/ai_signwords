import React, { useContext, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import colors from '../colors';
import { ThemeContext } from '../contexts/ThemeContext';
import { Video } from 'expo-av';

// 수어 검색 결과 리스트 화면
export default function SignWordListScreen({ route, navigation }) {
    const { results } = route.params;
    const { theme } = useContext(ThemeContext);
    const [openedIdx, setOpenedIdx] = useState(null);
    const [pausedIdx, setPausedIdx] = useState(null);

    // 각 아이템 렌더링
    const renderItem = ({ item, index }) => {
        const isOpened = openedIdx === index;
        const hasVideo = !!item.subDescription;
        const isPaused = pausedIdx === index;

        return (
            <TouchableOpacity
                activeOpacity={hasVideo ? 0.9 : 1}
                onPress={() => {
                    if (hasVideo) setOpenedIdx(isOpened ? null : index);
                }}
                disabled={!hasVideo}
            >
                <View style={[styles.itemBox, { backgroundColor: colors.lightGray }]}>
                    {/* 제목과 링크 버튼을 양쪽 정렬 */}
                    <View style={styles.rowBetween}>
                        <Text style={[styles.word, { color: theme.textColor }]}>{item.title}</Text>
                        {hasVideo && (
                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={e => {
                                    e.stopPropagation && e.stopPropagation();
                                    if (typeof window !== 'undefined') {
                                        window.open(item.subDescription, '_blank');
                                    }
                                }}
                            >
                                <Text style={styles.linkButtonText}>바로가기</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {/* 영상 URL이 없으면 안내만 표시 */}
                    {!hasVideo && (
                        <Text style={[styles.noVideo, { color: colors.red }]}>수어 영상 없음</Text>
                    )}
                    {item.signDescription ? (
                        <Text style={[styles.signDescription, { color: theme.textColor }]}>
                            수형 설명: {item.signDescription}
                        </Text>
                    ) : null}
                    {/* 영상 플레이어 */}
                    {isOpened && hasVideo ? (
                        <View style={styles.videoContainer}>
                            {/* X 닫기 버튼 */}
                            <TouchableOpacity style={styles.closeButton} onPress={() => setOpenedIdx(null)}>
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={1}
                                style={styles.videoTouchable}
                                onPress={() => setPausedIdx(isPaused ? null : index)}
                            >
                                {Platform.OS === 'web' ? (
                                    <video
                                        src={item.subDescription}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: colors.black,
                                            objectFit: 'contain',
                                            display: 'block',
                                        }}
                                        controls
                                    />
                                ) : (
                                    <Video
                                        source={{ uri: item.subDescription }}
                                        style={styles.video}
                                        useNativeControls
                                        resizeMode="contain"
                                        shouldPlay={!isPaused}
                                        isLooping={false}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
            <FlatList
                data={results}
                keyExtractor={(_, idx) => idx.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 0, paddingHorizontal: 0 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    itemBox: {
        backgroundColor: colors.lightGray,
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 14,
        marginBottom: 24,
        width: '100%',
        boxSizing: 'border-box',
        shadowColor: colors.gray,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    word: {
        fontSize: 20,
        color: colors.black,
        fontWeight: 'bold',
        marginRight: 10,
    },
    signDescription: {
        fontSize: 15,
        color: colors.text,
        marginTop: 2,
        marginBottom: 2,
    },
    noVideo: {
        fontSize: 13,
        color: colors.red,
        marginTop: 8,
    },
    linkButton: {
        backgroundColor: colors.gray, 
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 8,
        marginLeft: 10,
    },
    linkButtonText: {
        color: colors.white,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    videoContainer: {
        marginTop: 16,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        width: 400,
        aspectRatio: 700 / 466,
        backgroundColor: colors.black,
        alignSelf: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoTouchable: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    video: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.black,
        display: 'block',
        objectFit: 'contain',
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 2,
        backgroundColor: colors.white,
        borderRadius: 14,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.gray,
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    closeButtonText: {
        color: colors.gray,
        fontSize: 22,
        fontWeight: 'bold',
        lineHeight: 24,
    },
});