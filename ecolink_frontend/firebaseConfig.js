import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
  } from '@env';

// 환경 변수 디버깅을 위한 로그
console.log('Firebase 환경 변수 확인:');
console.log('FIREBASE_API_KEY:', FIREBASE_API_KEY);
console.log('FIREBASE_AUTH_DOMAIN:', FIREBASE_AUTH_DOMAIN);
console.log('FIREBASE_PROJECT_ID:', FIREBASE_PROJECT_ID);

// 환경 변수가 undefined인 경우 대체값 사용
const firebaseConfig = {
    apiKey: FIREBASE_API_KEY || "AIzaSyC0PqlswIJbKFDPsH2m30Vy8sa6w7Ki4v4",
    authDomain: FIREBASE_AUTH_DOMAIN || "ecolink-50324.firebaseapp.com",
    projectId: FIREBASE_PROJECT_ID || "ecolink-50324",
    storageBucket: FIREBASE_STORAGE_BUCKET || "ecolink-50324.firebasestorage.app",
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID || "652136999698",
    appId: FIREBASE_APP_ID || "1:652136999698:web:84b7c3416d47cfc518e1cb",
};
  
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);