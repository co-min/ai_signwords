import random
from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.views import APIView
import boto3

s3 = boto3.client('s3')
bucketName = 'echolink-dataset-archive-2025'
awsRegion = 'ap-northeast-2'  

class quiz_random_view(APIView):
    def post(self, request):
        folder = request.data.get('folder')
        classification = f"dataset2/{folder}/" #폴더를 지정
        response = s3.list_objects_v2(Bucket=bucketName, Prefix=classification) #폴더 안의 동영상 리스트를 받아옴
        #Prefix = classification 이 폴더 경로 안에 있는 동영상을 반환하라고 지시
        urls = []
        for obj in response.get('Contents', []):# Contents는는 S3 API에서 정해진 고정된 키
            key = obj['Key'] 
            filename = key.strip('.mp4').split('/')[-1]
            if filename != '': #가끔 빈 폴더명을 반환하느 경우가 있어서 제외시키는 코드.
                url = f"https://{bucketName}.s3-{awsRegion}.amazonaws.com/{key}"
                urls.append(url)
            
        quizList = [] # 10문제를 담을 리스트트
        urlsCopy = urls.copy() #원본 urls 리스트 복사함
        for obj in range(10):
            if len(urlsCopy) < 4:
                break
            url = random.choice(urlsCopy) #urls 리스트에서 랜덤으로 단어 하나를 뽑음.
            urlsCopy.remove(url) # 뽑은 단어는 urls 리스트에서 제거
            incorrect = random.sample(urlsCopy, k=3)
        
            if url.endswith('.mp4'):
                text = url.strip('.mp4').split('/')[-1]  # 파일명에서 확장자 제거 후 마지막 부분 추출
    
                incorrectArr = [
                    obj.strip('.mp4').split('/')[-1]
                    for obj in incorrect 
                ]  # 파일명에서 확장자 제거 후 마지막 부분 추출
                quizList.append({
                    'url' : url,
                    'text' : text,
                    'incorrectArr' : incorrectArr
                })

        return Response(quizList)

