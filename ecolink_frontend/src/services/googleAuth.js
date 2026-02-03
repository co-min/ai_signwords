
// import * as Google from 'expo-auth-session/providers/google';
// import { useEffect, useState } from 'expo-auth-session';
// import * as WebBrowser from 'expo-web-browser';

// //로그인 후, 웹 브라우저 창이 자동으로 닫히도록 
// WebBrowser.maybeCompleteAuthSession(); // 웹 브라우저 세션을 완료하기 위한 함수

// export const useGoogleAuth = () => {
//     const [userInfo, setUserInfo] = useState(null); // 초기값 null

//     const [request, response, promptAsync] = Google.useAuthRequest({ // Google OAuth 요청을 위한 설정
//         expoClientId: 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
//     });

//     useEffect(()=> {
//         if(response?.type == 'sucess') /* 응답이 성공적일 경우*/ {
//             const {authentication} = response; // 응답에서 인증 정보를 가져옴
//             fetchUserInfo(authentication?.accessToken); // 인증 토큰을 사용하여 사용자 정보를 가져옴
//         }
//     },[response]); // response가 변경될 때마다 useEffect 실행

// }