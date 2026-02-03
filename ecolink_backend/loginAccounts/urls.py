from django.urls import path
from .views import firebase_login_view

urlpatterns = [
    path('', firebase_login_view, name='firebase-googlelogin'),
]