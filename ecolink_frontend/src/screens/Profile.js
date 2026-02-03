import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import colors from '../colors';
import {Ionicons} from '@expo/vector-icons';
import { ThemeContext } from '../contexts/ThemeContext';
// Firebase Auth 및 Firestore import 
import { getAuth, GoogleAuthProvider, signOut } from 'firebase/auth';
// firebaseConfig에서 Firebase 앱 가져오기
import { app } from '../../firebaseConfig';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
// Firebase Storage import 
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';


const Profile = () => {
    const navigation = useNavigation();
    const { theme } = useContext(ThemeContext);

   
    const [user, setUser] = useState({
        name: 'default name',
        email: 'default@email.com',
        avatar: '',
    });
    const [loading, setLoading] = useState(true);
    

    // 1. 파이어베이스에서 로그인된 사용자 정보 불러오기
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const auth = getAuth(app);
                const currentUser = auth.currentUser;
                console.log( "currnetUser 정보: ", currentUser); //currentUser 불러옴 O
                
                if (!currentUser) {
                    console.log('로그인된 사용자가 없습니다.');
                    // 로그인 안된 경우 로그인 화면으로 이동
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                    return;
                }
                // 기본 정보
                const name = currentUser.displayName || '';
                console.log("사용자 이름: ", name); // 사용자 이름 불러옴 
                const email = currentUser.email || '';
                console.log("사용자 이메일: ", email); // 사용자 이메일일 불러옴 
                let avatar = currentUser.photoURL || '';
                console.log("사용자 아바타: ", avatar); // 사용자 아바타 불러옴
                 

                // Firestore에서 추가 정보(예: 커스텀 프로필 사진) 불러오기
                const db = getFirestore(app);
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.avatar) avatar = data.avatar;
                }
                setUser({ name, email, avatar });
                console.log("최종 사용자 정보: ", { name, email, avatar });

            } catch (e) {
                Alert.alert('오류', '사용자 정보를 불러올 수 없습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    // 2. 프로필 사진 업로드 및 DB 저장
    const handleAvatarPress = async () => {
        try {
            let imageUri = '';
            if (Platform.OS === 'web') {
                // 웹: input file 사용
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        // 1) Firebase Storage에 업로드
                        // 2) 업로드 후 URL 받아오기
                        // 3) Firestore에 URL 저장
                        // --- 아래 부분은 실제 구현 필요 ---
                        // const storage = getStorage();
                        // const storageRef = ref(storage, `avatars/${currentUser.uid}`);
                        // await uploadBytes(storageRef, file);
                        // const url = await getDownloadURL(storageRef);
                        // setUser(prev => ({ ...prev, avatar: url }));
                        // await updateDoc(doc(getFirestore(), 'users', currentUser.uid), { avatar: url });
                        // ---------------------------------
                        // 임시 미리보기
                        const url = URL.createObjectURL(file);
                        setUser(prev => ({ ...prev, avatar: url }));
                    }
                };
                input.click();
            } else {
                // 모바일: expo-image-picker 사용
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                    imageUri = result.assets[0].uri;
                    // 1) Firebase Storage에 업로드
                    // 2) 업로드 후 URL 받아오기
                    // 3) Firestore에 URL 저장
                    // --- 아래 부분은 실제 구현 필요 ---
                    // const response = await fetch(imageUri);
                    // const blob = await response.blob();
                    // const storage = getStorage();
                    // const storageRef = ref(storage, `avatars/${currentUser.uid}`);
                    // await uploadBytes(storageRef, blob);
                    // const url = await getDownloadURL(storageRef);
                    // setUser(prev => ({ ...prev, avatar: url }));
                    // await updateDoc(doc(getFirestore(), 'users', currentUser.uid), { avatar: url });
                    // ---------------------------------
                    // 임시 미리보기
                    setUser(prev => ({ ...prev, avatar: imageUri }));
                }
            }
        } catch (e) {
            Alert.alert('오류', '프로필 사진 업로드에 실패했습니다.');
        }
    };

    const handleLogout = () => {
        // Firebase 로그아웃 처리 필요
        if (typeof window !== 'undefined' && window.alert) {
            if (window.confirm('정말 로그아웃 하시겠습니까?')) {
                const auth = getAuth(app);
                signOut(auth).then(() => {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                });
            }
        } else {
            Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
                { text: "취소", style: "cancel" },
                {
                    text: "확인",
                    onPress: async () => {
                        const auth = getAuth(app);
                        await signOut(auth);
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }
                }
            ]);
        }
    };

    const handlePreference = () => {
        navigation.navigate('Preference');
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.darkBlue} />
            </View>
        );
    }

    // 여기에 북마크, 맞힌 갯수 추가정보를 표시해야함
    

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
            {/* 헤더 */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.textColor }]}>프로필</Text>
                <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
                    <Text style={styles.headerButtonText}>로그아웃</Text>
                </TouchableOpacity>
            </View>
            {/* 본문 */}
            <View style={styles.content}>

                <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarButton}>
                    {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="camera" size={40} color={colors.white} />
                        </View>
                    )}
                </TouchableOpacity>

                <Text style={[styles.name, { color: theme.textColor, fontSize: theme.fontSize }]}>{user.name}</Text>
                <Text style={[styles.email, { color: theme.textColor }]}>{user.email}</Text>
                <TouchableOpacity style={styles.prefButton} onPress={handlePreference}>
                    <Text style={styles.prefButtonText}>환경설정</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Profile;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderColor: colors.lightGray,
        backgroundColor: colors.white,
        paddingTop: 30,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.appleBlack,
    },
    headerButton: {
        padding: 8,
    },
    headerButtonText: {
        color: colors.darkBlue,
        fontSize: 16,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    avatarButton: {
        marginBottom: 20,
    },

    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        marginBottom: 20,
        backgroundColor: colors.gray,
    },

    avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.gray, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    email: {
        fontSize: 16,
        color: colors.gray,
        marginBottom: 24,
    },
    prefButton: {
        backgroundColor: colors.darkBlue,
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 20,
        marginTop: 10,
    },
    prefButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});