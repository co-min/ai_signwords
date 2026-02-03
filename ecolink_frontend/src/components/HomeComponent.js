import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import colors from '../colors';
import { useNavigation } from '@react-navigation/native';
import { REACT_APP_DJANGO_SERVER_URL } from '@env';
import { ThemeContext } from '../contexts/ThemeContext';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { app } from '../../firebaseConfig';
import { getAuth } from 'firebase/auth';

export default function HomeContent() {
    const [search, setSearch] = useState('');
    const navigation = useNavigation();
    const { theme } = useContext(ThemeContext);

    // 검색 버튼 클릭 시 실행
    const handleSearch = async () => {
        try {
            // 장고 서버에 검색 요청
            const response = await fetch(
                `${REACT_APP_DJANGO_SERVER_URL}/api/signwords/search/?keyword=${encodeURIComponent(search)}`,
                // console.log('서버주소' + REACT_APP_DJANGO_SERVER_URL)
            );
            if (!response.ok) {
                alert('서버에서 데이터를 찾을 수 없습니다.');
                return;
            }
            const data = await response.json();
            if (!data || data.length === 0) {
                alert('검색 결과가 없습니다.');
            } else { // 검색 결과가 있을 경우에 firestore에 검색 기록 저장
               //구글 로그인을 한 사용자 정보 가져오기
                const auth = getAuth(app);
                const currentUser = auth.currentUser;
                if(currentUser){
                    const db = getFirestore(app);
                    try {
                        //검색 기록 firestore에 저장
                        const docRef = await addDoc(collection(db, "users", currentUser.uid, "searchKeywordHistory"), {
                            keyword: search, //검색한 단어 value값으로 저장
                            searchedAt: serverTimestamp(), // 현재 시간으로 저장
                        });
                      } catch (e) {
                        console.error("검색 기록 저장 실패", e);
                      }
                      
                }
                // 검색 결과를 SignWordList 화면으로 전달
                navigation.navigate('SignWordList', { results: data });
            }
        } catch (error) {
            console.error("검색 처리 중 오류 발생:", error);
            alert("검색 처리 중 오류가 발생했습니다. 나중에 다시 시도해주세요.");
        }
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
            <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
                {/* 상단 헤더 */}
                <View style={[styles.header, { backgroundColor: theme.backgroundColor }]}>
                    <Text style={[styles.headerTitle, { color: theme.textColor, fontSize: theme.fontSize + 6 }]}>
                        Communication Bridge
                    </Text>
                </View>

                {/* 검색창 */}
                <View style={[styles.searchBox, { backgroundColor: theme.backgroundColor, borderColor: theme.textColor }]}>
                    <TextInput
                        style={[styles.searchInput, { color: theme.textColor, fontSize: theme.fontSize }]}
                        placeholder="검색어를 입력하세요"
                        placeholderTextColor={colors.gray}
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                        <Image
                            source={require('../assets/search-icon.png')}
                            style={styles.searchIcon}
                        />
                    </TouchableOpacity>
                </View>

                {/* 소개 문구 */}
                <Text style={[styles.title, { color: theme.textColor, fontSize: theme.fontSize + 2 }]}>
                    EchoLink, 위급상황에 모두가 대처하는 소리없는 아우성
                </Text>
                <View style={[styles.contentBox, { backgroundColor: colors.lightGray }]}>
                    <Text style={[styles.content, { color: theme.textColor, fontSize: theme.fontSize }]}>
                        EchoLink는 위급한 상황에서 수어 의사소통을 지원하는 AI 기반의 플랫폼입니다.{"\n"}
                        위급한 상황에서 번역된 수어와 대처 방법을 제공합니다.{"\n"}
                        아무리 위험한 상황이라도 저희를 믿고 따라와 준다면 해결할 수 있어요. {"\n"}
                        지금 바로 시작해보세요!
                    </Text>
                    <Image
                        source={require('../assets/adaptive-icon.png')}
                        style={styles.mainImage}
                        resizeMode="contain"
                    />
                    <Text style={[styles.sourceTitle, { color: theme.textColor, fontSize: theme.fontSize - 2 }]}>출처</Text>
                    <Text style={[styles.content, { color: theme.textColor, fontSize: theme.fontSize - 2 }]}>
                        EchoLink는 오픈소스 프로젝트로, GitHub에서 소스코드를 확인할 수 있습니다.{"\n"}
                        또한, 다양한 커뮤니티와 협력하여 지속적으로 발전하고 있습니다.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

// 스타일 정의 (colors.js의 색상 사용)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 40,
    },
    header: {
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderColor: colors.lightGray,
        paddingTop: 30,
    },
    headerTitle: {
        fontWeight: 'bold',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
        marginHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        paddingHorizontal: 15,
        height: 50,
        shadowColor: colors.black,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 0,
        backgroundColor: 'transparent',
    },
    searchButton: {
        padding: 6,
    },
    searchIcon: {
        width: 22,
        height: 22,
        tintColor: colors.middleGray,
    },
    title: {
        fontWeight: 'bold',
        alignItems: 'flex-start',
        paddingTop: 20,
        paddingLeft: 30,
        marginBottom: 40,
        marginTop: 60,
    },
    contentBox: {
        backgroundColor: colors.lightGray,
        alignItems: 'center',
        padding: 20,
        borderRadius: 30,
        marginLeft: 30,
        marginRight: 30,
        marginBottom: 20,
        paddingTop: 30,
        paddingBottom: 40,
    },
    content: {
        textAlign: 'center',
        marginBottom: 10,
    },
    mainImage: {
        width: 300,
        height: 200,
        marginTop: 20,
        alignItems: 'center',
        opacity: 0.5,
    },
    sourceTitle: {
        paddingBottom: 20,
        marginTop: 30,
    },
});