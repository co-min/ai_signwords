import os
import requests
import logging
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import SignWord

from ai_models.codes.normalization_cam import normalization
from ai_models.codes.emedding_test_n_return_54node import classify
from ai_models.codes.emedding_test_8emer_return_54node import classify8


logger = logging.getLogger(__name__)

class SignWordProxy(APIView):

    def get(self, request):
        keyword = request.GET.get('keyword')
        # if not keyword:
        #     # logger.warning("keyword 파라미터 없음")
        #     # return JsonResponse({'error': 'Keyword is required'}, status=400)
        #     words = SignWord.objects.all()
        #     results = [
        #         {
        #             "title": obj.title,
        #             "subDescription": obj.subDescription,
        #             "signDescription": obj.signDescription,
        #         }
        #         for obj in words
        #     ]
        #     return JsonResponse(results, safe=False)
        
        # 1. DB에서 먼저 조회 
        cache = SignWord.objects.filter(keyword=keyword)
        if cache.exists():
            results = [
                {
                    "title": obj.title,
                    "subDescription": obj.subDescription,
                    "signDescription": obj.signDescription, 
                }
                for obj in cache
            ]
            return JsonResponse(results, safe=False)
        
        # 2. DB에 없으면 Open API에서 가져오기
        service_key = os.getenv('KCISA_SERVICE_KEY')
        if not service_key:
            logger.error("KCISA_SERVICE_KEY 환경변수가 설정되지 않음")
            return JsonResponse({'error': 'Service key not configured'}, status=500)
            
        api_url = "http://api.kcisa.kr/openapi/service/rest/meta13/getCTE01701"
        params = {
            'serviceKey': service_key,
            'numOfRows': 3616,
            'pageNo': 1,
            "_type": "json",
            'keyword': keyword,
        }

        headers = {"accept": "application/json"}
        
        try:
            response = requests.get(api_url, params=params, headers=headers, timeout=30)
            response.raise_for_status()  # HTTP 에러 체크
            
            data = response.json()
            logger.debug(f"API Response: {data}")
            
            items = data.get("response", {}).get("body", {}).get("items", {}).get("item", [])

            # items가 dict(단일)일 수도 있으니 리스트로 변환
            if isinstance(items, dict):
                items = [items]

            if items:
                results = []
                for item in items:
                    try:
                        # keyword와 title을 모두 고려해서 저장 (중복 방지)
                        obj, created = SignWord.objects.get_or_create(
                            keyword=keyword,
                            title=item.get("title", "제목없음"),
                            defaults={
                                "subDescription": item.get("subDescription", ""),
                                "signDescription": item.get("signDescription", ""),
                            }
                        )
                        results.append({
                            "title": obj.title,
                            "subDescription": obj.subDescription,
                            "signDescription": obj.signDescription,
                        })
                    except Exception as db_error:
                        logger.error(f"DB 저장 중 오류: {str(db_error)}")
                        continue
                        
                return JsonResponse(results, safe=False)
            else:
                logger.info(f"OpenAPI에서 '{keyword}'에 대한 결과 없음")
                return JsonResponse({'error': 'No results found'}, status=404)
                
        except requests.exceptions.RequestException as req_error:
            logger.error(f"API 요청 오류: {str(req_error)}")
            return JsonResponse({'error': 'External API request failed'}, status=503)
        except ValueError as json_error:
            logger.error(f"JSON 파싱 오류: {str(json_error)}")
            return JsonResponse({'error': 'Invalid API response format'}, status=502)
        except Exception as e:
            logger.error(f"예상치 못한 오류: {str(e)}")
            return JsonResponse({
                "error": "Internal server error",
                "details": str(e)
            }, status=500)
        


class ChatAIProxy(APIView):
    DIRECT_ANSWERS = [
        {
            "patterns": ["수어 자격증", "수어 자격증 시험", "수어 자격증 종류", "수어 자격증 정보", "자격증"],
            "answer": "수어 자격증에 관심이 있으시군요! 대표적으로 한국수어능력검정시험(국립국어원 주관)이 있습니다. 자세한 정보는 국립국어원 홈페이지(https://www.korean.go.kr)에서 확인하실 수 있습니다."
        },
        {
            "patterns": ["수어 학습 사이트", "사이트"],
            "answer": "수어를 학습할 수 있는 대표적인 사이트로는 '국립국어원 한국수어사전'(https://sldict.korean.go.kr), '서울특별시농아인협회', '유튜브 수어 강의 채널' 등이 있습니다."
        },
        {
            "patterns": ["수어 배우는 방법", "수어 배우기", "수어 학습 방법"],
            "answer": "수어를 배우는 방법으로는 온라인 강의, 지역 커뮤니티 센터의 수어 강좌, 수어 동아리 참여 등이 있습니다. 꾸준한 연습과 실제 대화를 통해 익히는 것이 중요합니다. 수어 온라인 강의는 대표적으로 EBS 수어 배움터 (무료 강의), 한국농아인협회 수어 교실 (오프라인/온라인 과정), 유튜브의 다양한 수어 강의 채널 등이 있습니다."
        },
        {
            "patterns": ["수어 관련 행사", "행사", "수어 행사"],
            "answer": "수어 관련 행사로는 '세계 수화의 날'(9월 23일), '농아인의 날'(4월 20일) 등이 있으며, 각종 수어 워크숍과 세미나가 정기적으로 개최됩니다.\n2025년 9월 27일에는 인천광역시 남동구 인천애뜰 잔디광장에서 인천수어문화축제가 열리며, 수어 공연과 체험 부스, 농문화 전시 등이 마련됩니다. 이어서 9월 29일에는 서울 청계천 일대에서 제8회 서울특별시 수화문화제가 열려 공연과 체험 중심의 다양한 문화 행사가 진행됩니다. 또한, 2025년 2월 6일에는 서울 상암동 누리꿈스퀘어 국제회의실에서 한국수어-한국어 사전 개통 행사가 개최되어 사전 편찬 경과 보고와 시연, 공모전 시상식이 진행되었습니다. 같은 달 2월 3일에는 제주도청 별관에서 한국수어의 날 기념 캠페인이 열려 지역사회에 수어를 알리는 활동이 펼쳐졌습니다."
        },
        {
            "patterns": ["수어 초보자", "초보자 루틴", "초보자 공부", "초보자 공부 루틴"],
            "answer": "20분 수어 연습 루틴\n1. 워밍업 및 복습 (5분)\n전날 배운 단어와 표현을 빠르게 복습합니다.\n손 모양, 위치, 움직임을 정확히 다시 확인하고 따라해 봅니다.\n2. 새로운 어휘 및 표현 학습 (8분)\n하루에 3~5개의 새로운 수어 단어나 기본 문장 표현을 배웁니다.\n유튜브 영상이나 수어 앱을 활용해 동작을 보면서 따라 합니다.\n새로운 표현을 반복해서 연습해 손과 얼굴 표정의 조화를 익힙니다.\n3. 문장 만들기 및 실습 (5분)\n배운 단어와 표현을 사용해 간단한 문장이나 짧은 대화를 만들어 연습합니다.\n자신이 하는 수어를 영상으로 촬영해 동작과 표정을 체크합니다.\n4. 마무리 및 복습 계획 세우기 (2분)\n배운 내용을 정리하고 내일 복습할 어휘를 계획합니다.\n어려웠던 부분이나 헷갈리는 동작을 표시해둡니다."
        },
        {
            "patterns": ["응급", "경찰", "도움", "긴급", "119", "응급상황", "응급처치"],
            "answer": "먼저 주변 환경의 안전을 확인하세요!\n환자의 상태를 빠르게 평가하는 것이 중요합니다. 이후 즉시 119에 연락해 도움을 요청하세요.\n환자의 상태에 따라 필요한 응급처치를 실시해야 합니다. \n의식이 없거나 호흡이 정지된 경우 심폐소생술(CPR)을 즉시 시행하며, \n\n심한 출혈이나 호흡 곤란, 중독, 경련 등의 위급 상황도 신속히 119에 신고해야 합니다.\n\n 응급상황 시 기본 행동 원칙은 다음과 같습니다: \n1. 주변 환경이 안전한지 확인하고 본인과 환자의 안전 확보\n2. 환자의 의식과 호흡 상태 확인\n3. 응급 상황이 확인되면 즉시 119에 신고\n4. 심폐소생술이나 출혈 지혈 등 필요한 응급처치 수행\n5. 환자 상태 악화 시 지속적으로 관찰하며 추가 구조 요청\n특히 심정지 의심 시 심폐소생술 30회 가슴 압박과 2회의 인공호흡을 반복하며, 자동제세동기(AED)가 있다면 사용법에 따라 활용해야 하며, 응급처치 경험이 없더라도 지침에 따라 신속하게 대처하는 것이 중요합니다."
        },
        {
            "patterns": ["전화 바로가기", "전화 연결", "전화 도움", "전화번호", "긴급전화", "전화"],
            "answer": "긴급 상황이거나 도움이 필요하시면 아래 번호를 누르세요.\n스마트폰에서는 번호를 클릭하면 바로 전화 연결이 가능합니다.\n- <a href=\"tel:119\">119(응급)</a>\n- <a href=\"tel:112\">112(경찰)</a>\n- <a href=\"tel:129\">129(복지상담)</a>\n번호를 터치하면 바로 전화 연결이 됩니다."
        }
    ]

    def find_direct_answer(self, message):
        for item in self.DIRECT_ANSWERS:
            for pattern in item["patterns"]:
                if pattern in message:
                    return item["answer"]
        return None

    def post(self, request):
        user_message = request.data.get("message")
        if not user_message:
            return Response({"error": "No message provided"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. DIRECT_ANSWERS에서 context 추출
        direct_context = self.find_direct_answer(user_message)
        if direct_context:
            return Response({"answer": direct_context})
        # 직접 답변이 있으면 바로 반환

        HF_TOKEN = os.getenv("HF_TOKEN")
      
        if not HF_TOKEN:
            return Response({"error": "HF_TOKEN not set"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        API_URL = "https://router.huggingface.co/v1/chat/completions"
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}

        # 2. 없으면 기존 HuggingFace 프록시 로직
        system_content = (
            "당신은 친절한 한국어 수어 전문가입니다."
            "답변은 자세하고 명확하게, 일목요연하게 문장으로 답해주세요. "
            "강조 없이 답변하세요."
        )

        payload = {
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_message}
            ],
            "model": "google/gemma-2-2b-it:nebius",
            "temperature" : 0.7,
            "max_new_tokens": 512,
            "top_p": 0.9,
        }

        try:
            response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
            data = response.json()
            if "choices" in data:
                answer = data["choices"][0]["message"]["content"]
                return Response({"answer": answer})
            else:
                return Response({"error": "No answer from HuggingFace", "details": data}, status=status.HTTP_502_BAD_GATEWAY)
        except requests.exceptions.RequestException as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UploadKeypointsAPIView(APIView):
    def post(self, request):
        # 프론트에서 보낸 데이터 받기
        all_vectors = request.data.get('sign_language_data')
        total_frames = request.data.get('total_frames')

        if not all_vectors:
            return Response({'error': 'No sign_language_data provided'}, status=status.HTTP_400_BAD_REQUEST)

        # checkpoint_path='C:/github/EchoLink/ecolink_backend/ai_models/datas/54node12emer_tryNor_gaussimirrorcamAugmen.pth'

        # # 데이터 전처리 및 추론
        # normalized_data = normalization(all_vectors)
        # result = classify(checkpoint_path, normalized_data)

        checkpoint_path8Police='ai_models/datas/checkpoint_8wordsPolice_54node_trynor_gaussi_addcam.pth'
        label_list_Police=['경찰','교통사고','깔리다','병원',
                           '불나다','숨을안쉬다','쓰러지다','연락해주세요']
        normalized_data = normalization(all_vectors)
        pred = classify8(checkpoint_path8Police, normalized_data)
        result = label_list_Police[pred]

        return Response({'result': result, 'total_frames': total_frames})
