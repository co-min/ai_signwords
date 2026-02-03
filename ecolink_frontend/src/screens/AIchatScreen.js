import React, { useState, useContext } from 'react';
import {
    FlatList, StyleSheet,Text,View,
    TextInput,TouchableOpacity, KeyboardAvoidingView, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import colors from '../colors';
import { ThemeContext } from '../contexts/ThemeContext';
// import { REACT_APP_CHAT_SERVER_IP_URL  } from '@env';

const AIchatScreen = () => {
    const navigation = useNavigation();
    const [messages, setMessages] = useState([
        { id: '1', text: '안녕하세요, 저는 컴브챗입니다:) \n위급한 상황에서 빠르게 도움을 드리겠습니다.', isUser: false },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCamera = () => {
        Alert.alert('Camera');
    };

    const { theme } = useContext(ThemeContext);

    const REACT_APP_CHAT_SERVER_IP_URL = process.env.REACT_APP_CHAT_SERVER_IP_URL;

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = {
            id: Date.now().toString(),
            text: input,
            isUser: true,
        };

        const loadingId = 'loading_' + Date.now();

        const updatedMessages = [
            ...messages,
            userMsg,
            { id: loadingId, text: '답변중..', isUser: false, isLoading: true }
        ];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('http://localhost:8000/api/signwords/ai-chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                }),
            });

            const data = await res.json();
            const aiText = data.answer
                ? data.answer
                : 'AI 답변을 받아오지 못했습니다. 잠시 후 다시 시도해 주세요.';

            setMessages(prev => [
                ...prev.filter(msg => msg.id !== loadingId),
                { id: Date.now().toString() + '_ai', text: aiText, isUser: false }
            ]);
        } catch (error) {
             setMessages(prev => [
            ...prev.filter(msg => !msg.id.startsWith('loading_')),
            { id: Date.now().toString() + '_ai', text: 'AI 답변을 받아오지 못했습니다. 네트워크 또는 서버 오류입니다.', isUser: false }
            ]);
            Alert.alert('Error', 'AI 호출에 실패했습니다.\n' + (error.message || ''));
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={[
            styles.bubble,
            item.isUser ? [styles.userBubble, { backgroundColor: theme.backgroundColor }] : [styles.aiBubble, { backgroundColor: theme.backgroundColor }],
            {backgroundColor: item.isUser ? colors.white : colors.lightGray},
            item.isLoading && { opacity: 0.6 }
        ]}>
            <Text style={[
                styles.bubbleText,
                { color: theme.textColor, fontSize: theme.fontSize }
            ]}>
                {item.text}
            </Text>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.backgroundColor }]}
        >
            <View style={[styles.header, { backgroundColor: theme.backgroundColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Text style={[styles.headerIcon, { color: theme.textColor }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textColor, fontSize: theme.fontSize }]}>Chat AI</Text>
                <TouchableOpacity onPress={handleCamera} style={styles.headerButton}>
                    <Text style={[styles.headerIcon, { color: theme.textColor }]}>📷</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.chatList}
            />

            <View style={[styles.inputContainer, { backgroundColor: theme.backgroundColor, borderColor: colors.lightGray }]}>
                <TextInput
                    style={[styles.input, { color: theme.textColor, backgroundColor: colors.white, fontSize: theme.fontSize }]}
                    value={input}
                    onChangeText={setInput}
                    placeholder="메시지를 입력하세요"
                    placeholderTextColor={colors.gray}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                />
                <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.darkBlue }]} onPress={handleSend} disabled={isLoading}>
                    <Text style={styles.sendButtonText}>전송</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export default AIchatScreen;

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
    },
    chatList: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 80,
    },
    bubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 16,
        marginVertical: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderTopLeftRadius: 0,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderTopRightRadius: 0,
    },
    bubbleText: {
        fontSize: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
    },
    sendButton: {
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});