from .firebase_utils import verify_firebase_token
from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def firebase_login_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        id_token = data.get('token')
        uid = verify_firebase_token(id_token)
        if uid:
            # 인증 성공: uid로 사용자 처리
            return JsonResponse({'uid': uid, 'message': '인증 성공'})
        else:
            # 인증 실패
            return JsonResponse({'error': 'Invalid token'}, status=401)