# api/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # ==========================================
    # AUTHENTICATION & PROFILES
    # ==========================================
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', views.register_player, name='register_player'),
    path('profile/', views.get_user_profile, name='get_user_profile'),

    # ==========================================
    # PLAYER DASHBOARD FEATURES
    # ==========================================
    path('player/history/', views.player_match_history, name='player_match_history'),
    
    # Team Management
    path('teams/', views.manage_teams, name='manage_teams'),           # GET (list teams) / POST (create team)
    path('teams/join/', views.join_team, name='join_team'),            # POST (join via 8-char code)

    # Player Matchmaking
    path('queue/join/', views.join_queue, name='join_queue'),          # POST (enter the waiting room)
    path('queue/status/', views.check_queue_status, name='queue_status'), # GET (polling for Room ID)

    # ==========================================
    # HOST DASHBOARD FEATURES
    # ==========================================
    path('host/queue/', views.host_manage_queue, name='host_queue'),             # GET (view players waiting)
    path('host/auto-allocate/', views.host_auto_allocate, name='host_auto_allocate'), # POST (system groups players)
    
    # Results & Leaderboards
    path('upload-results/', views.upload_results, name='upload_results'),        # POST (upload OCR screenshots)
    path('leaderboard/<int:tournament_id>/', views.tournament_leaderboard, name='tournament_leaderboard'), # GET (public)

    path('teams/<int:team_id>/', views.delete_team, name='delete_team'),

    # Player Matchmaking
    path('queue/leave/', views.leave_queue, name='leave_queue'),

    path('host/active-room/', views.host_active_room, name='host_active_room'),

    path('host/abort-room/', views.host_abort_room, name='host-abort-room'),
]