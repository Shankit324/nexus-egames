from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from .ocr_engine import process_screenshot
from .models import Match, PlayerProfile, MatchResult, Tournament, MatchQueue, Team, TeamMember

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_results(request):
    # 1. Security Check: Only hosts can upload results
    if not request.user.is_staff:
        return Response({"error": "Unauthorized"}, status=403)
        
    # Check for the plural 'files' key sent by the frontend array
    if 'files' not in request.FILES:
        return Response({"error": "No image files provided."}, status=400)
    
    room_id = request.data.get('room_id')
    match_id = request.data.get('match_id') # Optional, if you pass this from React
    uploaded_files = request.FILES.getlist('files')
    
    if not room_id:
        return Response({"error": "Room ID is required to process results."}, status=400)

    try:
        # ==============================================================
        # 2. BUILD THE "VIP LIST" OF REGISTERED PLAYERS
        # ==============================================================
        allocations = MatchQueue.objects.filter(room_id=room_id, status='Allocated')
        
        if not allocations.exists():
            return Response({"error": f"No registered players found for Room ID: {room_id}. Are you sure this room is active?"}, status=404)
            
        valid_player_profiles = {} # Maps lowercase IGN -> Actual PlayerProfile object
        
        for q in allocations:
            if q.team:
                for member in q.team.members.all():
                    valid_player_profiles[member.player.ign.lower()] = member.player
            elif q.player:
                valid_player_profiles[q.player.ign.lower()] = q.player

        # ==============================================================
        # 3. PROCESS ALL UPLOADED IMAGES VIA OCR ENGINE
        # ==============================================================
        combined_parsed_data = []
        for uploaded_file in uploaded_files:
            image_bytes = uploaded_file.read()
            parsed_data = process_screenshot(image_bytes)
            combined_parsed_data.extend(parsed_data)
        
        # ==============================================================
        # 4. FILTER OUT INTRUDERS & SAVE TO POSTGRESQL
        # ==============================================================
        filtered_leaderboard = []
        match_obj = Match.objects.get(id=match_id) if match_id else None
        
        for item in combined_parsed_data:
            # Handle potential key variations from OCR
            ign_name = item.get('ign') or item.get('player')
            
            if not ign_name:
                continue
                
            # 🛡️ THE BOUNCER: Only process if they were officially registered!
            if ign_name.lower() in valid_player_profiles:
                player_profile = valid_player_profiles[ign_name.lower()]
                
                kills = item.get('kills', 0)
                placement = item.get('placement', 0)
                points = item.get('points', 0)
                
                # Save results to PostgreSQL if a match_id is provided
                if match_obj:
                    MatchResult.objects.update_or_create(
                        match=match_obj,
                        player=player_profile,
                        defaults={
                            'kills': kills,
                            'placement': placement,
                            'points_awarded': points
                        }
                    )
                
                filtered_leaderboard.append({
                    "ign": player_profile.ign, # Return the exact registered name
                    "kills": kills,
                    "placement": placement,
                    "points": points
                })

        # ==============================================================
        # 5. SORT & CLEANUP
        # ==============================================================
        # Sort the final filtered list so the highest points are at the top
        filtered_leaderboard = sorted(
            filtered_leaderboard, 
            key=lambda x: x.get('points', 0), 
            reverse=True
        )
        
        # Mark match as completed
        if match_obj:
            match_obj.is_completed = True
            match_obj.save()
            
        # VERY IMPORTANT: Delete the queue entries so the room is no longer "Active"
        allocations.delete()

        return Response({
            "status": "success", 
            "leaderboard": filtered_leaderboard
        }, status=200)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny]) # Leaderboards are usually public, no token required
def tournament_leaderboard(request, tournament_id):
    # Ensure the tournament actually exists before querying
    tournament = get_object_or_404(Tournament, id=tournament_id)

    # The Django ORM Magic: Query, Aggregate, and Sort in one database hit
    leaderboard_data = PlayerProfile.objects.filter(
        matchresult__match__tournament=tournament
    ).annotate(
        total_points=Sum('matchresult__points_awarded'),
        total_kills=Sum('matchresult__kills'),
        matches_played=Count('matchresult__match', distinct=True)
    ).order_by(
        '-total_points',  # Primary sort: Highest points first
        '-total_kills'    # Tie-breaker: Highest kills first
    )

    # Format the queryset into a clean JSON response for the Vite frontend
    response_data = {
        "tournament_name": tournament.title,
        "leaderboard": [
            {
                "rank": index + 1,
                "ign": player.ign,
                "uid": player.uid,
                "matches_played": player.matches_played,
                "total_kills": player.total_kills,
                "total_points": player.total_points
            }
            for index, player in enumerate(leaderboard_data)
        ]
    }

    return Response(response_data, status=200)

@api_view(['POST'])
@permission_classes([AllowAny]) # Anyone can access this to sign up
def register_player(request):
    data = request.data
    
    # Basic validation
    if not all(k in data for k in ("username", "password", "ign", "uid")):
        return Response({"error": "Missing required fields."}, status=400)

    try:
        # THE FIX: Wrap the creation steps in an atomic transaction
        with transaction.atomic():
            # 1. Create the base Django User
            user = User.objects.create_user(
                username=data['username'],
                password=data['password']
            )
            
            # 2. Create the linked Free Fire profile
            PlayerProfile.objects.create(
                user=user,
                ign=data['ign'],
                uid=data['uid']
            )
            
        # This will only execute if BOTH steps above succeed
        return Response({"message": "Player registered successfully!"}, status=201)
        
    except IntegrityError:
        # Because of transaction.atomic(), if the IGN or UID triggers this error, 
        # the base User account is instantly deleted/rolled back.
        return Response({"error": "Username, IGN, or UID already exists."}, status=400)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """Returns data about the currently logged-in user so the frontend knows what to display"""
    user = request.user
    
    response_data = {
        "username": user.username,
        "is_host": user.is_staff, # You can use is_staff to determine if they are a tournament host
    }
    
    # If this user has a linked PlayerProfile, include those details
    if hasattr(user, 'playerprofile'):
        response_data['is_player'] = True
        response_data['ign'] = user.playerprofile.ign
        response_data['uid'] = user.playerprofile.uid
    else:
        response_data['is_player'] = False

    return Response(response_data, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def player_match_history(request):
    try:
        # 1. Identify the player profile linked to the logged-in user
        player_profile = request.user.playerprofile
    except PlayerProfile.DoesNotExist:
        return Response({"error": "No player profile found for this account."}, status=404)

    # 2. Fetch results and join the Match & Tournament data efficiently
    results = MatchResult.objects.filter(
        player=player_profile
    ).select_related(
        'match', 'match__tournament'
    ).order_by('-uploaded_at') # Newest matches first

    # 3. Format the data for the frontend
    history_data = []
    for result in results:
        history_data.append({
            "id": result.id,
            "tournament_name": result.match.tournament.title,
            "match_number": result.match.match_number,
            "kills": result.kills,
            "placement": result.placement,
            "points": result.points_awarded,
            "date": result.uploaded_at.strftime("%b %d, %Y")
        })

    return Response({"history": history_data}, status=200)

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def manage_teams(request):
    player_profile = request.user.playerprofile

    # CREATE A TEAM
    if request.method == 'POST':
        data = request.data
        team_size = int(data.get('size', 4))
        
        # 1. Create the team
        new_team = Team.objects.create(
            name=data.get('name'),
            leader=player_profile,
            size=team_size
        )
        
        # 2. Add the leader as the first team member
        TeamMember.objects.create(team=new_team, player=player_profile)
        
        return Response({"message": "Team created!", "team_code": new_team.team_code}, status=201)

    # GET PLAYER'S TEAMS
    if request.method == 'GET':
        # Find all teams where this player is a member
        memberships = TeamMember.objects.filter(player=player_profile).select_related('team', 'team__leader')
        
        teams_data = []
        for membership in memberships:
            team = membership.team
            # Get all members of this specific team
            roster = [{"ign": m.player.ign} for m in team.members.all()]
            
            teams_data.append({
                "id": team.id,
                "name": team.name,
                "team_code": team.team_code,
                "size_limit": team.size,
                "is_leader": team.leader == player_profile,
                "roster": roster
            })
            
        return Response({"teams": teams_data}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_queue(request):
    player_profile = request.user.playerprofile
    team_id = request.data.get('team_id') 
    
    if team_id:
        team = get_object_or_404(Team, id=team_id)
        
        if team.leader != player_profile:
            return Response({"error": "Only the team leader can join the matchmaking queue."}, status=403)
            
        # NEW: Check if the team is completely full!
        if team.members.count() != team.size:
            return Response({"error": f"Your team is not full! You need {team.size} players to join the queue."}, status=400)
            
        MatchQueue.objects.create(team=team)
        return Response({"message": f"{team.name} has joined the queue!"}, status=200)
    
    else:
        MatchQueue.objects.create(player=player_profile)
        return Response({"message": "You have joined the solo queue!"}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_team(request):
    team_code = request.data.get('team_code')
    player_profile = request.user.playerprofile

    if not team_code:
        return Response({"error": "Team code is required."}, status=400)

    # 1. Find the team by code
    team = Team.objects.filter(team_code=team_code).first()
    if not team:
        return Response({"error": "Invalid team code. Please check and try again."}, status=404)

    # 2. Check if the team is full
    current_members = team.members.count()
    if current_members >= team.size:
        return Response({"error": "This team is already full!"}, status=400)

    # 3. Check if the player is already in this specific team
    if TeamMember.objects.filter(team=team, player=player_profile).exists():
        return Response({"error": "You are already a member of this team."}, status=400)

    # 4. Add the player to the team
    TeamMember.objects.create(team=team, player=player_profile)
    
    return Response({"message": f"Successfully joined {team.name}!"}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def host_auto_allocate(request):
    """Systematically groups waiting players and assigns them to the Custom Room"""
    if not request.user.is_staff:
        return Response({"error": "Unauthorized"}, status=403)

    room_id = request.data.get('room_id')
    target_mode = request.data.get('mode', 'Squad')

    if not room_id:
        return Response({"error": "Room ID is required."}, status=400)

    waiting_entries = MatchQueue.objects.filter(
        status='Waiting', 
        game_mode=target_mode
    ).order_by('joined_queue_at')

    if not waiting_entries.exists():
        return Response({"error": "No players in the queue for this mode."}, status=400)

    def get_size(entry):
        return entry.team.size if entry.team else 1

    sorted_entries = list(waiting_entries)
    sorted_entries.sort(key=get_size, reverse=True)

    max_slot_size = 4 if target_mode == 'Squad' else (2 if target_mode == 'Duo' else 1)
    max_slots = 12

    slots = [] 
    for entry in sorted_entries:
        size = get_size(entry)
        placed = False
        
        for slot in slots:
            if slot['current_size'] + size <= max_slot_size:
                slot['entries'].append(entry)
                slot['current_size'] += size
                placed = True
                break
        
        if not placed:
            if len(slots) < max_slots:
                slots.append({'current_size': size, 'entries': [entry]})
            else:
                break 

    # 4. Save the allocations to the database (NO PASSWORD SAVED)
    allocated_count = 0
    for index, slot in enumerate(slots):
        slot_num = index + 1 
        for entry in slot['entries']:
            entry.status = 'Allocated'
            entry.room_id = room_id
            entry.slot_number = slot_num
            entry.save()
            allocated_count += get_size(entry)

    return Response({
        "message": f"System matched {allocated_count} players into {len(slots)} slots!",
        "room_id": room_id
    }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_queue_status(request):
    """Allows players to check if the system assigned them to a room"""
    player_profile = request.user.playerprofile
    
    # Check Solo queue
    active_solo = MatchQueue.objects.filter(player=player_profile, status__in=['Waiting', 'Allocated']).first()
    
    # Check Team queue
    my_teams = player_profile.my_teams.values_list('team_id', flat=True)
    active_team = MatchQueue.objects.filter(team_id__in=my_teams, status__in=['Waiting', 'Allocated']).first()
    
    active_queue = active_solo or active_team
    
    if active_queue:
        return Response({
            "in_queue": True,
            "status": active_queue.status,
            "mode": active_queue.game_mode,
            "room_id": active_queue.room_id,
            "room_password": active_queue.room_password,
            "slot_number": active_queue.slot_number # Tell them which slot to sit in
        }, status=200)
        
    return Response({"in_queue": False}, status=200)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_team(request, team_id):
    """Allows a team leader to permanently delete their team"""
    team = get_object_or_404(Team, id=team_id)
    
    # Security check: Only the leader can delete it
    if team.leader != request.user.playerprofile:
        return Response({"error": "Only the team leader can delete this team."}, status=403)
        
    team.delete()
    return Response({"message": "Team deleted successfully!"}, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def host_manage_queue(request):
    """Allows the Host to view the queue of waiting players and their exact IGNs"""
    if not request.user.is_staff:
        return Response({"error": "Unauthorized"}, status=403)

    # Show the Host everyone waiting for a match
    waiting_queue = MatchQueue.objects.filter(status='Waiting').order_by('joined_queue_at')
    
    queue_data = []
    for q in waiting_queue:
        # NEW: Get the exact player IGNs so the Host can verify them in the Custom Room
        if q.team:
            roster = [member.player.ign for member in q.team.members.all()]
            name = q.team.name
        else:
            roster = [q.player.ign]
            name = q.player.ign

        queue_data.append({
            "queue_id": q.id,
            "type": "Team" if q.team else "Solo",
            "name": name,
            "mode": q.game_mode,
            "roster": roster, # <-- Sending the roster array to the frontend
            "time_waiting": q.joined_queue_at.strftime("%H:%M:%S")
        })
        
    return Response({"queue": queue_data}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def leave_queue(request):
    """Allows a player or team leader to exit the matchmaking queue or room"""
    player_profile = request.user.playerprofile
    
    # 1. Check if the player is in the queue Solo
    active_solo = MatchQueue.objects.filter(player=player_profile, status__in=['Waiting', 'Allocated']).first()
    if active_solo:
        active_solo.delete()
        return Response({"message": "You have left the queue."}, status=200)
        
    # 2. Check if a team the player LEADS is in the queue
    my_led_teams = player_profile.led_teams.values_list('id', flat=True)
    active_team = MatchQueue.objects.filter(team_id__in=my_led_teams, status__in=['Waiting', 'Allocated']).first()
    if active_team:
        active_team.delete()
        return Response({"message": "Your team has been removed from the queue."}, status=200)
        
    # 3. If they are in a queued team, but NOT the leader, block them from pulling the whole team out
    my_teams = player_profile.my_teams.values_list('team_id', flat=True)
    if MatchQueue.objects.filter(team_id__in=my_teams, status__in=['Waiting', 'Allocated']).exists():
        return Response({"error": "Only the Team Leader can pull the team out of the queue."}, status=403)
        
    return Response({"error": "You are not currently in a queue."}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def host_active_room(request):
    """Fetches the currently active room and its assigned player roster"""
    if not request.user.is_staff:
        return Response({"error": "Unauthorized"}, status=403)
        
    # Get players currently assigned to a room (status='Allocated')
    active_allocations = MatchQueue.objects.filter(status='Allocated').order_by('slot_number')
    
    if not active_allocations.exists():
        return Response({"has_active_room": False}, status=200)
        
    room_id = active_allocations.first().room_id
    room_password = getattr(active_allocations.first(), 'room_password', None)
    
    roster_data = []
    for q in active_allocations:
        if q.team:
            # 1. Team Logic: Extract both IGNs and UIDs for all members
            igns = [m.player.ign for m in q.team.members.all()]
            uids = [str(m.player.uid) for m in q.team.members.all()]
            name = q.team.name
            
            # Join multiple UIDs with a comma for the frontend display
            final_uid = ", ".join(uids) 
        else:
            # 2. Solo Logic: Extract single IGN and UID
            igns = [q.player.ign]
            name = q.player.ign
            final_uid = str(q.player.uid)
            
        roster_data.append({
            "slot": q.slot_number,
            "type": "Team" if q.team else "Solo",
            "name": name,
            "igns": igns,
            "uid": final_uid  # <-- The missing link is now sent to React!
        })
        
    return Response({
        "has_active_room": True,
        "room_id": room_id,
        "room_password": room_password,
        "roster": roster_data
    }, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def host_abort_room(request):
    """Cancels the active room and returns all allocated players to the waiting queue."""
    if not request.user.is_staff:
        return Response({"error": "Unauthorized"}, status=403)
        
    # Find all players currently assigned to the room
    allocated_players = MatchQueue.objects.filter(status='Allocated')
    
    if not allocated_players.exists():
        return Response({"error": "No active room found to abort."}, status=400)
        
    # Revert them back to the waiting queue
    for entry in allocated_players:
        entry.status = 'Waiting'
        entry.room_id = None
        entry.room_password = None
        entry.slot_number = None
        entry.save()
        
    return Response({"message": "Room aborted. Players returned to queue."}, status=200)