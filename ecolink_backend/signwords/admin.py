from django.contrib import admin

# Register your models here.

from .models import SignWord

#admin.site.register(SignWord)

# 커스터마이징 
@admin.register(SignWord)
class SignWordAdmin(admin.ModelAdmin):
    list_display = ('id', 'keyword', 'title', 'subDescription', 'signDescription', 'created_at')
    search_fields = ('keyword', 'title')