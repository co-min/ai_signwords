import React, { useEffect } from "react";
import { Platform, SafeAreaView, View, Image, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import colors from "../colors";
import { useNavigation } from "@react-navigation/native";
import * as Google from 'expo-auth-session/providers/google';
import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut } from "firebase/auth";
import { app } from '../../firebaseConfig';
import { webClientId, expoClientId, ANDROID_CLIENT_ID } from '@env';
import { makeRedirectUri } from 'expo-auth-session';
// const { webClientId } = Constants.expoConfig.extra; //새로 추가함

// 로그인 화면

const LoginScreen = () => {
    const navigation = useNavigation();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const redirectUri = makeRedirectUri({
        // native: 'your.app://redirect', // 네이티브 앱일 때만 필요
        useProxy: true, // Expo Go, 웹에서 자동으로 올바른 URI 생성
    });

    // 구글 로그인 요청 세팅
    Google.useAuthRequest({
        expoClientId,
        webClientId,
        androidClientId: ANDROID_CLIENT_ID,
        redirectUri,
    });

    const handleGoogleLogin = () => {

        const auth = getAuth(app); 
        if(Platform.OS === 'web'){
            signInWithPopup(auth, provider)
          .then((result) => {
            console.log("web으로 로그인 성공");
            
            const credential = GoogleAuthProvider.credentialFromResult(result);
            
            const token = credential.accessToken; //구글 엑세스 토큰을 가져옴
            
            console.log("사용자 엑세스 토큰: " + token);
            // The signed-in user info.
            const user = result.user;
            const currentUser = auth.currentUser;
            if (currentUser) {
              currentUser.getIdToken(true).then(token => {
                fetch('http://localhost:8000/api/firebase-googlelogin/', { //백엔드 엔드포인트 url
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token })
                })
                .then(res => res.json())
                .then(data => {
                  console.log('백엔드 응답:', data);
                  if (data.error) {
                    Alert.alert('로그인 실패', data.error);
                    return;
                  }
                  navigation.navigate('Home');
                });
              }).catch(function(error) {
                // Handle error
              });
            } else {
              console.log('currentUser가 없습니다.');
            }
          }).catch((error) => {
            // Handle Errors here.
           error.message = "웹에서 로그인이 실패되었습니다.";
           Alert.alert(error.message);
          });
        }
        else {
            signInWithCredential(auth, provider)
            .then((result) => {
                console.log("app으로 로그인 성공");
                
                // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            
            const token = credential.accessToken; //구글 엑세스 토큰을 가져옴
            
            console.log("사용자 엑세스 토큰: " + token);
            // The signed-in user info.
            const user = result.user;
            const currentUser = auth.currentUser;
            if (currentUser) {
              currentUser.getIdToken(true).then(token => {
                fetch('http://localhost:8000/api/firebase-googlelogin/', { //백엔드 엔드포인트 url
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token })
                })
                .then(res => res.json())
                .then(data => {
                  console.log('백엔드 응답:', data);
                  if (data.error) {
                    Alert.alert('로그인 실패', data.error);
                    return;
                  }
                  navigation.navigate('Home');
                });
              }).catch(function(error) {
                // Handle error
              });
            } else {
              console.log('currentUser가 없습니다.');
            }
          }).catch((error) => {
            // Handle Errors here.
           error.message = "웹에서 로그인이 실패되었습니다.";
           Alert.alert(error.message);
          });

        }
        
    };


    const handleAppleLogin = () => {
        Alert.alert("Apple 로그인");
    }

    const handleKakaoLogin = () => {
        Alert.alert("Kakao 로그인");
    }

    const handleGotoHome = () => {
        navigation.navigate('Home');
    }
  

    return (
        <SafeAreaView style={styles.container}>

            <View style={styles.loginContainer}>
                <Image
                source={require('../assets/icon.png')}
                style={styles.loginImage}
                resizeMode="contain"
                />
            </View>

            <View style={styles.content}>
            <Text style={styles.title}>Login</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.googleBlue }]} onPress={handleGoogleLogin}>
                <Text style={styles.buttonText}>Google로 로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.appleBlack }]} onPress={handleAppleLogin}>
                <Text style={styles.buttonText}>Apple로 로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.kakaoYellow }]} onPress={handleKakaoLogin}>
                <Text style={[styles.buttonText, { color: colors.appleBlack }]}>Kakao로 로그인</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[{ backgroundColor: colors.white }]} onPress={handleGotoHome}>
                <Text style={styles.homeText}>홈으로 가기</Text>
            </TouchableOpacity>
            </View>
            
        </SafeAreaView>
    );
}

export default LoginScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white
    },

    loginContainer: {
        width: '100%',
        height: 300, // 원하는 높이(px)로 지정
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingTop: 50,
    },

       loginImage: {
        marginTop: 40,
        marginLeft: 5,
        width: 400,
        height: 400,
        opacity: 0.2,
        
    },

    content: {
        backgroundColor: colors.white,
        borderTopLeftRadius:20,
        borderTopRightRadius:20,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },

    title: {
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 30,
        color: colors.text,
        paddingVertical: 12,
        paddingHorizontal: 50
    },
    button: {
        width: 250,
        paddingVertical: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 12,
        
    },
    buttonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    homeText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: 'bold',
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 50,
        opacity: 0.5,
        textDecorationLine: 'underline',
    }

});
