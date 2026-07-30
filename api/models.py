import random
import string
from django.db import models
from django.contrib.auth.models import User

class PlayerProfile(models.Model):
    """Extends Django's built-in User model to store Free Fire details"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    ign = models.CharField(max_length=50, unique=True, help_text="In-Game Name")
    uid = models.CharField(max_length=20, unique=True, help_text="Free Fire Character UID")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ign} ({self.uid})"


class Tournament(models.Model):
    """Represents a tournament event created by a host"""
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.title


class Match(models.Model):
    """A specific custom room match inside a tournament"""
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='matches')
    match_number = models.PositiveIntegerField()
    room_id = models.CharField(max_length=50, blank=True, null=True)
    room_password = models.CharField(max_length=50, blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tournament.title} - Match #{self.match_number}"


class MatchResult(models.Model):
    """Stores the final parsed stats for a player in a specific match"""
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='results')
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE)
    kills = models.PositiveIntegerField(default=0)
    placement = models.PositiveIntegerField(help_text="Final team/player placement rank")
    points_awarded = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Ensures a player only has one result entry per match
        unique_together = ('match', 'player')

    def __str__(self):
        return f"{self.player.ign} - Rank #{self.placement} ({self.points_awarded} pts)"

class Team(models.Model):
    """A team created by a leader to join matches"""
    TEAM_SIZES = [(2, 'Duo'), (3, 'Trio'), (4, 'Squad')]
    
    name = models.CharField(max_length=50)
    team_code = models.CharField(max_length=8, unique=True, blank=True) # 8-character code to join
    leader = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='led_teams')
    size = models.IntegerField(choices=TEAM_SIZES)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Auto-generate a random 8-character team code if it doesn't exist
        if not self.team_code:
            self.team_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.get_size_display()})"


class TeamMember(models.Model):
    """Players inside a specific team"""
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='members')
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, related_name='my_teams')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('team', 'player') # A player can only join the same team once


class MatchQueue(models.Model):
    """The waiting area for individuals or teams looking for a match"""
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, null=True, blank=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True, blank=True)
    is_allocated = models.BooleanField(default=False)
    joined_queue_at = models.DateTimeField(auto_now_add=True)

class MatchQueue(models.Model):
    GAME_MODES = [
        ('Solo', 'Single (1v1)'),
        ('Duo', 'Double (2v2)'),
        ('Trio', 'Triple (3v3)'),
        ('Squad', 'Quadruple / TPP-4'),
    ]
    
    player = models.ForeignKey(PlayerProfile, on_delete=models.CASCADE, null=True, blank=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True, blank=True)
    
    game_mode = models.CharField(max_length=20, choices=GAME_MODES, default='Squad')
    room_id = models.CharField(max_length=50, blank=True, null=True)
    room_password = models.CharField(max_length=50, blank=True, null=True)
    
    # NEW: Tell the player which slot to sit in
    slot_number = models.IntegerField(null=True, blank=True) 
    status = models.CharField(max_length=20, default='Waiting') 
    
    joined_queue_at = models.DateTimeField(auto_now_add=True)

