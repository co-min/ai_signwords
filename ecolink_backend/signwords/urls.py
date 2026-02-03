from django.urls import path
from .views import SignWordProxy
from .views import ChatAIProxy
from .views import UploadKeypointsAPIView


urlpatterns = [
    path('search/', SignWordProxy.as_view(), name='signword-search'),
    path('ai-chat/', ChatAIProxy.as_view(), name='ai-chat'),
    path('upload-keypoints/', UploadKeypointsAPIView.as_view(), name='upload-keypoints'),
]