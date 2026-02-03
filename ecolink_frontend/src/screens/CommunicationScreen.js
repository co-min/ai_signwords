import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, TextInput } from 'react-native';
import React, { useState, useRef, useContext, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import colors from '../colors';
import CameraComponent from '../components/CameraComponent';
import { ThemeContext } from '../contexts/ThemeContext';
import socketService from '../services/socket';

const CommunicationScreen = () => {
    const navigation = useNavigation();
    const [showCamera, setShowCamera] = useState(false);
    const { theme } = useContext(ThemeContext);
    const [isConnected, setIsConnected] = useState(false);

    const [messages, setMessages] = useState([
        {
            id: '1',
            text: '안녕하세요! 수어를 사용해서 대화해보세요. 📷 버튼을 눌러 카메라를 시작하세요.',
            isUser: false,
            type: 'system',
            timestamp: new Date().toLocaleTimeString()
        }
    ]);
    const [input, setInput] = useState('');
    const flatListRef = useRef(null);

    // WebSocket 연결 및 결과 처리
    useEffect(() => {
        // WebSocket 서버 URL (환경에 맞게 수정)
        const WS_SERVER_URL = 'ws://localhost:8000'; // 실제 서버 주소로 변경
        
        // WebSocket 연결
        // socketService.connect(WS_SERVER_URL);
        
        // 수어 인식 결과 리스너 등록
        const handleSignRecognitionResult = (data) => {
            console.log('서버로부터 수어 인식 결과 수신:', data);
            
            if (data.recognized_sign) {
                // 인식된 수어 단어 처리
                handleSignRecognized({
                    sign: data.recognized_sign,
                    confidence: data.confidence || 0,
                    description: data.description || '',
                    keyword: data.keyword || data.recognized_sign,
                    isError: false
                });
            } else if (data.error) {
                // 에러 처리
                handleSignRecognized({
                    sign: data.error,
                    isError: true
                });
            }
        };
        
        socketService.addListener(handleSignRecognitionResult);
        setIsConnected(true);
        
        return () => {
            // 컴포넌트 언마운트 시 정리
            socketService.removeListener(handleSignRecognitionResult);
            socketService.disconnect();
            setIsConnected(false);
        };
    }, []);

    // 카메라 종료 시 호출
    const handleVideoEnd = (chatData) => {
        setShowCamera(false);
        addMessage(chatData.user_message, false, 'system'); 
        // addMessage(chatData.user_message, true, 'text');
    };

    // 수어 인식 결과 처리 - 왼쪽 말풍선으로 표시
    const handleSignRecognized = (recognitionData) => {
        if (recognitionData.isError) {
            // 에러 메시지 (사전에 없는 단어 등)
            addMessage(recognitionData.sign, false, 'error');
        } else {
            // 인식된 수어 단어의 뜻을 왼쪽 말풍선에 표시
            let messageText = `🤟 ${recognitionData.sign}`;
            
            // 수어사전에서 가져온 설명이 있으면 추가
            if (recognitionData.description) {
                messageText += `\n💬 ${recognitionData.description}`;
            }
            
            // 키워드가 있으면 추가
            if (recognitionData.keyword && recognitionData.keyword !== recognitionData.sign) {
                messageText += `\n🏷️ 관련어: ${recognitionData.keyword}`;
            }
            
            addMessage(messageText, false, 'sign_recognition', {
                confidence: recognitionData.confidence,
                keyword: recognitionData.keyword,
                originalSign: recognitionData.sign
            });
        }
    };

    // 메시지 추가 함수
    const addMessage = (text, isUser = false, type = 'text', metadata = null) => {
        const newMessage = {
            id: Date.now().toString() + Math.random(),
            text: text,
            isUser: isUser,
            type: type,
            metadata: metadata,
            timestamp: new Date().toLocaleTimeString()
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // 메시지 추가 후 스크롤
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
    };

    // 텍스트 메시지 전송
    const handleSend = () => {
        if (!input.trim()) return;
        
        // 사용자 메시지 (오른쪽 말풍선)
        addMessage(input, true, 'text');
        setInput('');
        
        // 간단한 자동 응답 (실제로는 챗봇 API 연동 가능)
        // setTimeout(() => {
        //     addMessage('메시지를 받았습니다. 수어로도 소통해보세요! 📷', false, 'system');
        // }, 1000);
    };

    // 카메라 토글
    const toggleCamera = () => {
        if (showCamera) {
            setShowCamera(false);
            addMessage('카메라가 종료되었습니다.', false, 'system');
        } else {
            setShowCamera(true);
            // addMessage('📷 카메라가 시작되었습니다. 수어를 사용해보세요!', false, 'system');
        }
    };

    // 메시지 아이템 렌더링
    const renderItem = ({ item }) => (
        <View style={styles.messageContainer}>
            <View style={[
                styles.bubble,
                item.isUser 
                    ? [styles.userBubble, { backgroundColor: colors.darkBlue }] 
                    : [styles.aiBubble, getBubbleColor(item.type)]
            ]}>
                {/* 메시지 타입별 아이콘 */}
                {!item.isUser && renderMessageIcon(item.type)}
                
                {/* 메시지 텍스트 */}
                <Text style={[
                    styles.bubbleText, 
                    { 
                        color: item.isUser ? colors.white : theme.textColor, 
                        fontSize: theme.fontSize 
                    }
                ]}>
                    {item.text}
                </Text>
                
                {/* 신뢰도 표시 (수어 인식 결과일 때) */}
                {item.type === 'sign_recognition' && item.metadata?.confidence && (
                    <Text style={styles.confidenceText}>
                        신뢰도: {item.metadata.confidence.toFixed(1)}%
                    </Text>
                )}
                
                {/* 타임스탬프 */}
                <Text style={[
                    styles.timestampText,
                    { color: item.isUser ? colors.white : colors.gray }
                ]}>
                    {item.timestamp}
                </Text>
            </View>
        </View>
    );

    // 메시지 타입별 아이콘
    const renderMessageIcon = (type) => {
        let icon = '';
        switch (type) {
            case 'sign_recognition':
                icon = '🤟';
                break;
            case 'error':
                icon = '⚠️';
                break;
            case 'system':
                icon = '🤖';
                break;
            default:
                icon = '💬';
        }
        return <Text style={styles.messageIcon}>{icon}</Text>;
    };

    // 메시지 타입별 배경색
    const getBubbleColor = (type) => {
        switch (type) {
            case 'sign_recognition':
                return { backgroundColor: colors.lightGreen };
            case 'error':
                return { backgroundColor: colors.lightRed };
            case 'system':
                return { backgroundColor: colors.lightBlue };
            default:
                return { backgroundColor: colors.lightGray };
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.backgroundColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* 헤더 */}
            <View style={[styles.header, { backgroundColor: theme.backgroundColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Text style={[styles.headerIcon, { color: theme.textColor }]}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: theme.textColor, fontSize: theme.fontSize }]}>
                        수어 소통
                    </Text>
                    <Text style={[styles.connectionStatus, { color: isConnected ? colors.green : colors.red }]}>
                        {isConnected ? '🟢 연결됨' : '🔴 연결 안됨'}
                    </Text>
                </View>
                <TouchableOpacity onPress={toggleCamera} style={styles.headerButton}>
                    <Text style={[styles.headerIcon, { color: showCamera ? colors.red : theme.textColor }]}>
                        {showCamera ? '📹' : '📷'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 카메라 또는 채팅 화면 */}
            {showCamera ? (
                <View style={styles.cameraContainer}>
                    <CameraComponent 
                        showCamera={showCamera} 
                        onVideoEnd={handleVideoEnd}
                        onSignRecognized={handleSignRecognized}
                    />
                    
                    {/* 카메라 상태 안내 */}
                    <View style={styles.cameraOverlay}>
                        <Text style={styles.cameraGuide}>
                            🎥 수어를 보여주세요. 인식된 단어가 채팅에 나타납니다.
                            3초후부터 시작됩니다.
                        </Text>
                    </View>
                </View>
            ) : (
                <>
                    {/* 채팅 메시지 리스트 */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.chatList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        showsVerticalScrollIndicator={false}
                    />
                    
                    {/* 텍스트 입력 영역 */}
                    <View style={[styles.inputContainer, { backgroundColor: theme.backgroundColor, borderColor: colors.lightGray }]}>
                        <TextInput
                            style={[styles.input, { color: theme.textColor, backgroundColor: colors.white, fontSize: theme.fontSize }]}
                            placeholder="메시지를 입력하세요..."
                            placeholderTextColor={colors.gray}
                            value={input}
                            onChangeText={setInput}
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity 
                            style={[
                                styles.sendButton, 
                                { 
                                    backgroundColor: input.trim() ? colors.darkBlue : colors.gray,
                                    opacity: input.trim() ? 1 : 0.5
                                }
                            ]} 
                            onPress={handleSend}
                            disabled={!input.trim()}
                        >
                            <Text style={styles.sendButtonText}>전송</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </KeyboardAvoidingView>
    );
};

export default CommunicationScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderColor: colors.lightGray,
        paddingTop: 30,
    },
    headerButton: {
        padding: 8,
    },
    headerIcon: {
        fontSize: 24,
    },
    headerTitle: { 
        fontWeight: 'bold',
        fontSize: 18,
    },
    headerTitleContainer: {
        alignItems: 'center',
        flex: 1,
    },
    connectionStatus: {
        fontSize: 10,
        marginTop: 2,
    },
    cameraContainer: {
        flex: 1,
        position: 'relative',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cameraGuide: {
        color: colors.white,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    chatList: { 
        padding: 16, 
        paddingBottom: 80,
        flexGrow: 1,
    },
    messageContainer: {
        marginVertical: 4,
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginVertical: 2,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderTopLeftRadius: 4,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderTopRightRadius: 4,
    },
    messageIcon: {
        fontSize: 16,
        marginBottom: 4,
    },
    bubbleText: {
        fontSize: 16,
        lineHeight: 22,
    },
    confidenceText: {
        fontSize: 12,
        color: colors.darkGray,
        marginTop: 6,
        fontStyle: 'italic',
    },
    timestampText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        padding: 8,
        paddingHorizontal: 16,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 8,
        maxHeight: 100,
        minHeight: 40,
    },
    sendButton: {
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 40,
    },
    sendButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});