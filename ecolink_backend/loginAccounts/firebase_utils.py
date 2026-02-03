from django.conf import settings
# The Firebase Admin SDK to access Cloud Firestore.
import firebase_admin
from firebase_admin import initialize_app, firestore, credentials, auth

if not firebase_admin._apps: #초기 한번만 초기화되도록.
    try:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIAL_PATH)  # 서비스 계정 키 경로
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Firebase Admin SDK 초기화 실패: {e}")

def verify_firebase_token(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        # firebase를 통해 얻은 uid 등 사용자 정보 활용 가능
        return uid
    except Exception as e:
        # 토큰이 유효하지 않음
        return None


