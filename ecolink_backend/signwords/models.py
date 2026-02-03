from django.db import models

# Create your models here.

class SignWord(models.Model):
    keyword = models.CharField(max_length=100)  # 수어 단어 키워드
    title = models.CharField(max_length=200, default="제목없음") # 수어 단어
    subDescription = models.URLField(null=True) #수어 영상
    signDescription = models.TextField(null=True) #수어 설명
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title #모델 객체를 문자열로 표현할 때 사용

    


# 동작 흐름
# keyword로 DB 조회

# 있으면 DB 데이터 반환
# 없으면 Open API 호출
# Open API 호출 결과를 DB에 저장

# 그리고 프론트로 결과 반환
