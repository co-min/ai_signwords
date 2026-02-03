from django.urls import path
from .views import quiz_random_view

urlpatterns = [
    path('', quiz_random_view.as_view(), name='signquiz'),
]