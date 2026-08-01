// src/components/PlayerDashboard.jsx
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export default function PlayerDashboard({ profile }) {
    const [currentView, setCurrentView] = useState('dashboard');
    
    const [history, setHistory] = useState([]);
    const [teams, setTeams] = useState([]);
    
    const [teamName, setTeamName] = useState('');
    const [teamSize, setTeamSize] = useState(4);
    const [joinCode, setJoinCode] = useState('');
    const [queueMessage, setQueueMessage] = useState('');

    const [matchStatus, setMatchStatus] = useState(null);

    const fetchHistory = async () => {
        try {
            const response = await apiFetch('/api/player/history/');
            if (response.ok) {
                const data = await response.json();
                setHistory(data.history);
            }
        } catch (error) { console.error(error); }
    };

    const fetchTeams = async () => {
        try {
            const response = await apiFetch('/api/teams/');
            if (response.ok) {
                const data = await response.json();
                setTeams(data.teams);
            }
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        fetchTeams();
        fetchHistory();

        const checkQueueStatus = async () => {
            try {
                const response = await apiFetch('/api/queue/status/');
                if (response.ok) {
                    const data = await response.json();
                    if (data.in_queue) {
                        setMatchStatus(data);
                    } else {
                        setMatchStatus(null);
                    }
                }
            } catch (error) { console.error(error); }
        };

        checkQueueStatus();
        const intervalId = setInterval(checkQueueStatus, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        try {
            const response = await apiFetch('/api/teams/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: teamName, size: teamSize })
            });
            if (response.ok) {
                setTeamName('');
                fetchTeams(); 
            }
        } catch (error) { console.error(error); }
    };

    const handleJoinTeam = async (e) => {
        e.preventDefault();
        try {
            const response = await apiFetch('/api/teams/join/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_code: joinCode })
            });
            const data = await response.json();
            if (response.ok) {
                setJoinCode('');
                alert(data.message);
                fetchTeams(); 
            } else {
                alert(data.error);
            }
        } catch (error) { console.error("Failed to join team", error); }
    };

    // UPDATED: Now accepts a 'mode' parameter for Solo/ClashSquad/Squad routing
    const handleJoinQueue = async (teamId = null, mode = 'Squad') => {
        try {
            const payload = teamId ? { team_id: teamId, mode } : { mode };
            
            const response = await apiFetch('/api/queue/join/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch (err) {
                console.error("Server HTML error:", text);
                alert("A server error occurred. Please check your backend console.");
                return;
            }

            if (response.ok) {
                setQueueMessage(data.message);
                const statusRes = await apiFetch('/api/queue/status/');
                if (statusRes.ok) setMatchStatus(await statusRes.json());
            } else {
                alert(data.error);
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteTeam = async (teamId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this team?");
        if (!confirmDelete) return;

        try {
            const response = await apiFetch(`/api/teams/${teamId}/`, { method: 'DELETE' });
            if (response.ok) {
                fetchTeams(); 
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) { console.error("Failed to delete team", error); }
    };

    const handleLeaveQueue = async () => {
        const confirmLeave = window.confirm("Are you sure you want to leave? If you are a team leader, this will pull your entire squad out of the match.");
        if (!confirmLeave) return;

        try {
            const response = await apiFetch('/api/queue/leave/', { method: 'POST' });
            
            if (response.ok) {
                setMatchStatus(null); 
                setQueueMessage('');
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) { console.error("Failed to leave queue", error); }
    };

    // ==========================================
    // RENDER: MATCH HISTORY VIEW
    // ==========================================
    if (currentView === 'history') {
        return (
            <div className="player-dashboard" style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 15px', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <style>{`
                    .player-dashboard .btn-anim { transition: all 0.2s ease; }
                    .player-dashboard .btn-anim:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                `}</style>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '2rem', margin: 0, color: '#f8fafc' }}>Past Match History</h2>
                    <button onClick={() => setCurrentView('dashboard')} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#334155' }}>
                        ← Back to Dashboard
                    </button>
                </div>
                
                <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                    {history.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                            <p style={{ fontSize: '1.2rem', margin: 0 }}>You haven't played any tracked matches yet.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: '#0f172a' }}>
                                <tr>
                                    <th style={{ padding: '16px', color: '#94a3b8' }}>Date</th>
                                    <th style={{ padding: '16px', color: '#94a3b8' }}>Tournament</th>
                                    <th style={{ padding: '16px', color: '#94a3b8' }}>Placement</th>
                                    <th style={{ padding: '16px', color: '#94a3b8' }}>Kills</th>
                                    <th style={{ padding: '16px', color: '#94a3b8', textAlign: 'right' }}>Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((match) => (
                                    <tr key={match.id} style={{ borderTop: '1px solid #334155' }}>
                                        <td style={{ padding: '16px', color: '#cbd5e1' }}>{match.date}</td>
                                        <td style={{ padding: '16px', fontWeight: 'bold', color: '#f8fafc' }}>{match.tournament_name}</td>
                                        <td style={{ padding: '16px', color: '#60a5fa', fontWeight: 'bold' }}>#{match.placement}</td>
                                        <td style={{ padding: '16px', color: '#cbd5e1' }}>{match.kills}</td>
                                        <td style={{ padding: '16px', color: '#10b981', fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem' }}>+{match.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: MAIN DASHBOARD VIEW
    // ==========================================
    return (
        <div className="player-dashboard" style={{ position: 'relative', maxWidth: '960px', margin: '2rem auto', padding: '0 15px', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* INJECTED CSS */}
            <style>{`
                .player-dashboard input, .player-dashboard select {
                    padding: 12px 16px; border-radius: 8px; border: 1px solid #475569;
                    background-color: #0f172a; color: white; font-size: 1rem; transition: all 0.2s;
                    box-sizing: border-box; width: 100%;
                }
                .player-dashboard input:focus, .player-dashboard select:focus {
                    outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                .player-dashboard .btn-anim { transition: all 0.2s ease; }
                .player-dashboard .btn-anim:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .player-dashboard .btn-anim:active:not(:disabled) { transform: translateY(0); }
                .player-dashboard .card {
                    background-color: #1e293b; padding: 24px; border-radius: 12px; 
                    border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    display: flex; flex-direction: column; justify-content: space-between;
                }
                .pulse-text { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
            `}</style>
            
            {/* MATCH FOUND OVERLAY (Full Screen Modal) */}
            {matchStatus?.status === 'Allocated' && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', zIndex: 9999, 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: 'white', textAlign: 'center', padding: '20px'
                }}>
                    <div style={{ animation: 'popIn 0.3s ease-out' }}>
                        <h1 style={{ color: '#10b981', fontSize: '4rem', margin: '0 0 10px 0', textShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>MATCH FOUND!</h1>
                        <p style={{ fontSize: '1.25rem', color: '#cbd5e1', marginBottom: '40px' }}>Your squad has been auto-assigned to a Custom Room.</p>
                        
                        <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', width: '100%', minWidth: '400px', maxWidth: '500px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '16px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Room ID:</span>
                                <strong style={{ fontSize: '2rem', letterSpacing: '2px', color: '#f8fafc' }}>{matchStatus.room_id}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '16px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Password:</span>
                                <strong style={{ fontSize: '2rem', letterSpacing: '2px', color: '#ef4444' }}>{matchStatus.room_password}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Your Slot:</span>
                                <strong style={{ fontSize: '2rem', color: '#3b82f6' }}>#{matchStatus.slot_number}</strong>
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '40px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '16px 24px', borderRadius: '8px', color: '#fbbf24', fontSize: '1.1rem' }}>
                            ⚠️ Open Free Fire immediately and sit ONLY in your assigned slot.
                        </div>
                        
                        <button onClick={handleLeaveQueue} className="btn-anim" style={{ ...btnStyle, backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '12px 32px', fontSize: '1rem', marginTop: '30px' }}>
                            Abort / Leave Room
                        </button>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
                        Welcome back, <span style={{ color: '#10b981', fontWeight: '800' }}>{profile.ign}</span>
                    </h2>
                    <p style={{ color: '#94a3b8', margin: 0 }}>Ready for your next match?</p>
                </div>
                <button onClick={() => setCurrentView('history')} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                    View Past Matches
                </button>
            </div>

            {/* WAITING BANNER */}
            {matchStatus?.status === 'Waiting' && (
                <div style={{ padding: '20px 24px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong style={{ color: '#fbbf24', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="pulse-text">🕒</span> In Matchmaking Queue ({matchStatus.mode})
                        </strong>
                        <p style={{ margin: '4px 0 0 0', color: '#d97706', fontSize: '0.9rem' }}>Waiting for the tournament host to allocate your room...</p>
                    </div>
                    <button onClick={handleLeaveQueue} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#ef4444' }}>
                        Leave Queue
                    </button>
                </div>
            )}
            
            {/* HIDE ACTION SECTIONS IF IN QUEUE */}
            {!matchStatus && (
                <>
                    {/* ======================================================= */}
                    {/* 1. QUICK PLAY MODES (TOP)                               */}
                    {/* ======================================================= */}
                    <div style={{ marginBottom: '3rem' }}>
                        <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                            ⚔️ Quick Play Modes
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            
                            <div className="card">
                                <div>
                                    <h4 style={{ fontSize: '1.25rem', margin: '0 0 8px 0', color: '#f8fafc' }}>Battle Royale (Solo)</h4>
                                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Join the matchmaking queue as a lone wolf.</p>
                                </div>
                                <button onClick={() => handleJoinQueue(null, 'Solo')} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#3b82f6', width: '100%', marginTop: 'auto' }}>
                                    Join Solo Queue
                                </button>
                            </div>

                            <div className="card">
                                <div>
                                    <h4 style={{ fontSize: '1.25rem', margin: '0 0 8px 0', color: '#f8fafc' }}>Clash Squad (4v4)</h4>
                                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Fast-paced 4v4 tactical battle. Queue with randoms or your squad.</p>
                                </div>
                                <button onClick={() => handleJoinQueue(null, 'ClashSquad')} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#f59e0b', width: '100%', marginTop: 'auto' }}>
                                    Join Clash Queue
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ======================================================= */}
                    {/* 2. SQUAD MANAGEMENT (BOTTOM)                            */}
                    {/* ======================================================= */}
                    <div style={{ marginBottom: '3rem' }}>
                        <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                            🛡️ Squad Management
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            
                            <div className="card">
                                <div>
                                    <h4 style={{ fontSize: '1.25rem', margin: '0 0 8px 0', color: '#f8fafc' }}>Create a Team</h4>
                                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>Lead your own squad to victory.</p>
                                </div>
                                <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
                                    <input type="text" placeholder="Team Name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
                                    <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                                        <option value="4">Squad (4 Players)</option>
                                        <option value="3">Trio (3 Players)</option>
                                        <option value="2">Duo (2 Players)</option>
                                    </select>
                                    <button type="submit" className="btn-anim" style={{ ...btnStyle, backgroundColor: '#3b82f6', width: '100%' }}>Create</button>
                                </form>
                            </div>

                            <div className="card">
                                <div>
                                    <h4 style={{ fontSize: '1.25rem', margin: '0 0 8px 0', color: '#f8fafc' }}>Join a Team</h4>
                                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>Enter an 8-character invite code.</p>
                                </div>
                                <form onSubmit={handleJoinTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
                                    <input type="text" placeholder="TEAM CODE" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={8} required style={{ textTransform: 'uppercase', letterSpacing: '1px' }}/>
                                    <button type="submit" className="btn-anim" style={{ ...btnStyle, backgroundColor: '#10b981', width: '100%' }}>Join</button>
                                </form>
                            </div>

                        </div>
                    </div>
                </>
            )}

            {/* MY TEAMS LIST */}
            <div>
                <h3 style={{ fontSize: '1.5rem', color: '#f8fafc', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>My Active Teams</h3>
                
                {teams.length === 0 ? (
                    <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px dashed #334155', textAlign: 'center', color: '#64748b' }}>
                        <p>You are not in any teams yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {teams.map(team => {
                            const isTeamFull = team.roster.length === team.size_limit;
                            // Determine mode based on team size
                            const teamMode = team.size_limit === 2 ? 'Duo' : 'Squad';
                            
                            return (
                                <div key={team.id} className="card" style={{ padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {team.name}
                                                <span style={{ fontSize: '0.8rem', padding: '4px 8px', backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid #334155', color: '#94a3b8' }}>
                                                    {team.roster.length}/{team.size_limit} Players
                                                </span>
                                            </h4>
                                            {!isTeamFull && <p style={{ fontSize: '13px', color: '#f59e0b', margin: '6px 0 0 0' }}>Waiting for players...</p>}
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {team.is_leader && !matchStatus && isTeamFull && (
                                                <button onClick={() => handleJoinQueue(team.id, teamMode)} className="btn-anim" style={{...btnStyle, backgroundColor: '#10b981'}}>Queue for Match</button>
                                            )}
                                            {team.is_leader && (
                                                <button onClick={() => handleDeleteTeam(team.id)} className="btn-anim" style={{...btnStyle, backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444'}}>Disband</button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Invite Code:</span>
                                            <strong style={{ color: '#3b82f6', letterSpacing: '2px', fontSize: '1.1rem' }}>{team.team_code}</strong>
                                        </div>
                                        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '8px', color: '#cbd5e1', fontSize: '0.95rem' }}>
                                            <strong style={{ color: '#64748b' }}>Roster: </strong> {team.roster.map(r => r.ign).join(', ')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

const btnStyle = { padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', border: 'none', color: 'white' };