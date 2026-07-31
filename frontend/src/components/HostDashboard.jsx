// src/components/HostDashboard.jsx
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export default function HostDashboard() {
    const [activeTab, setActiveTab] = useState('lobby'); 
    
    // --- LOBBY & ACTIVE ROOM STATES ---
    const [queue, setQueue] = useState([]);
    const [roomId, setRoomId] = useState('');
    const [allocating, setAllocating] = useState(false);
    
    const [allocationSuccess, setAllocationSuccess] = useState(false); 
    const [activeRoom, setActiveRoom] = useState(null);

    // --- RESULT PHASE STATES ---
    const [resultRoomId, setResultRoomId] = useState('');
    const [files, setFiles] = useState([null]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [uploading, setUploading] = useState(false);

    const fetchQueue = async () => {
        try {
            const response = await apiFetch('/api/host/queue/');
            if (response.ok) {
                const data = await response.json();
                setQueue(data.queue);
            }
        } catch (error) { console.error("Failed to fetch queue", error); }
    };

    const fetchActiveRoom = async () => {
        try {
            const response = await apiFetch('/api/host/active-room/');
            if (response.ok) {
                const data = await response.json();
                if (data.has_active_room) {
                    setActiveRoom(data);
                    setResultRoomId(data.room_id);
                    setAllocationSuccess(true);
                } else {
                    setActiveRoom(null);
                    setAllocationSuccess(false);
                }
            }
        } catch (error) { console.error("Failed to fetch active room", error); }
    };

    useEffect(() => {
        fetchActiveRoom();
        if (activeTab === 'lobby') {
            fetchQueue();
            const interval = setInterval(fetchQueue, 10000); 
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    const handleAllocateLobby = async (e) => {
        e.preventDefault();
        setAllocating(true);
        try {
            const response = await apiFetch('/api/host/auto-allocate/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: roomId, mode: 'Squad' }) // Password completely removed
            });
            const data = await response.json();
            
            if (response.ok) {
                fetchActiveRoom(); 
                fetchQueue();
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while allocating the room.");
        } finally {
            setAllocating(false);
        }
    };

    const handleProceedToUpload = () => {
        setRoomId('');               
        setActiveTab('results');     
    };

    const handleFileChange = (index, selectedFile) => {
        const newFiles = [...files];
        newFiles[index] = selectedFile;
        setFiles(newFiles);
    };

    const handleUploadResults = async (e) => {
        e.preventDefault();
        const validFiles = files.filter(f => f !== null);
        if (validFiles.length === 0) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('room_id', resultRoomId); 
        validFiles.forEach(file => formData.append('files', file));

        try {
            const response = await apiFetch('/api/upload-results/', { method: 'POST', body: formData });
            const data = await response.json();
            if (response.ok) {
                setLeaderboard(data.leaderboard);
                setAllocationSuccess(false); 
                setActiveRoom(null);
                alert("Results processed and broadcasted to players!");
            } else {
                alert(data.error);
            }
        } catch (error) { console.error(error); } finally { setUploading(false); }
    };

    return (
        <div className="host-dashboard" style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 15px', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            <style>{`
                .host-dashboard .custom-scroll::-webkit-scrollbar { width: 8px; }
                .host-dashboard .custom-scroll::-webkit-scrollbar-track { background: #0f172a; border-radius: 8px; }
                .host-dashboard .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 8px; border: 2px solid #0f172a; }
                .host-dashboard .custom-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
                .host-dashboard input:focus { outline: 2px solid #3b82f6; border-color: transparent; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
                .host-dashboard .btn-anim { transition: all 0.2s ease; }
                .host-dashboard .btn-anim:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .host-dashboard .btn-anim:active:not(:disabled) { transform: translateY(0); }
                .host-dashboard .btn-anim:disabled { opacity: 0.6; cursor: not-allowed; }
                .host-dashboard .list-card { transition: background-color 0.2s; }
                .host-dashboard .list-card:hover { background-color: #1e293b; }
            `}</style>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Tournament Control Center
                </h2>
                <p style={{ color: '#94a3b8', margin: 0 }}>Manage lobbies and process match results efficiently.</p>
            </div>
            
            <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '6px', borderRadius: '12px', marginBottom: '24px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
                <button 
                    onClick={() => setActiveTab('lobby')} 
                    className="btn-anim"
                    style={{ ...tabBtn, backgroundColor: activeTab === 'lobby' ? '#1e293b' : 'transparent', color: activeTab === 'lobby' ? '#3b82f6' : '#64748b', boxShadow: activeTab === 'lobby' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}
                >
                    <span style={{ marginRight: '8px' }}>🎮</span> 1. Create & Allocate Room
                </button>
                <button 
                    onClick={() => setActiveTab('results')} 
                    className="btn-anim"
                    style={{ ...tabBtn, backgroundColor: activeTab === 'results' ? '#1e293b' : 'transparent', color: activeTab === 'results' ? '#10b981' : '#64748b', boxShadow: activeTab === 'results' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}
                >
                    <span style={{ marginRight: '8px' }}>📊</span> 2. Upload Match Screenshots
                </button>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #334155' }}>
                
                {activeTab === 'lobby' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {!allocationSuccess && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: queue.length > 0 ? '#10b981' : '#64748b', boxShadow: queue.length > 0 ? '0 0 10px #10b981' : 'none' }}></div>
                                        Live Matchmaking Queue
                                    </h3>
                                    <span style={{ backgroundColor: '#0f172a', padding: '4px 12px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 'bold', border: '1px solid #334155' }}>
                                        {queue.length} Waiting
                                    </span>
                                </div>
                                
                                <div className="custom-scroll" style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: '#0f172a', padding: '12px', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                                    {queue.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                            <p style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>Queue is empty</p>
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Waiting for players to join...</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {queue.map(q => (
                                                <div key={q.queue_id} className="list-card" style={{ padding: '16px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                        <strong style={{ fontSize: '1.1rem', color: q.type === 'Team' ? '#60a5fa' : '#34d399' }}>
                                                            {q.type.toUpperCase()}: {q.name}
                                                        </strong>
                                                        <span style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '2px 8px', borderRadius: '4px' }}>
                                                            Waiting: {q.time_waiting}
                                                        </span>
                                                    </div>
                                                    {q.roster && (
                                                        <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                                                            <strong style={{ color: '#64748b' }}>Roster: </strong> {q.roster.join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                            
                            {allocationSuccess && activeRoom ? (
                                <div>
                                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '2rem', marginBottom: '16px' }}>
                                            ✓
                                        </div>
                                        <h3 style={{ color: '#10b981', fontSize: '1.75rem', margin: '0 0 8px 0' }}>Room Broadcasted</h3>
                                        <p style={{ color: '#94a3b8', margin: 0 }}>Players have received their slot assignments.</p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                                        <div style={{ width: '50%', backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                                            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Room ID</div>
                                            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f8fafc', letterSpacing: '2px' }}>{activeRoom.room_id}</div>
                                        </div>
                                    </div>

                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#cbd5e1' }}>Expected Free Fire Roster (Invite manually):</h4>
                                    <div className="custom-scroll" style={{ maxHeight: '250px', overflowY: 'auto', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', marginBottom: '24px' }}>
                                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#334155' }}>
                                                <tr>
                                                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Slot</th>
                                                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Team Name</th>
                                                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Registered IGNs</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeRoom.roster.map((r, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                                                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#60a5fa' }}>#{r.slot}</td>
                                                        <td style={{ padding: '12px 16px', color: '#f8fafc' }}>{r.name}</td>
                                                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{r.igns.join(', ')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <button onClick={handleProceedToUpload} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#3b82f6', width: '100%', padding: '16px', fontSize: '1.1rem' }}>
                                        Match Started → Move to Result Upload
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#f8fafc' }}>Host Custom Room</h4>
                                    <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 20px 0' }}>
                                        Create your room in Free Fire, then paste the Room ID here to assign waiting players to their slots.
                                    </p>
                                    <form onSubmit={handleAllocateLobby} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Free Fire Room ID" 
                                            value={roomId} 
                                            onChange={(e) => setRoomId(e.target.value)} 
                                            required 
                                            style={{ ...inputStyle, flex: 2 }} 
                                        />
                                        <button type="submit" disabled={allocating || queue.length === 0} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#3b82f6', flex: 1 }}>
                                            {allocating ? 'Processing...' : 'Broadcast to Queue'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'results' && (
                    <div>
                        <h3 style={{ margin: '0 0 24px 0', fontSize: '1.5rem' }}>Process Match Results</h3>
                        
                        <form onSubmit={handleUploadResults} style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '8px' }}>Room ID Being Processed:</label>
                                <input type="text" value={resultRoomId} onChange={(e) => setResultRoomId(e.target.value)} placeholder="e.g. 9823412" required style={{ ...inputStyle, width: '100%' }} />
                                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>This ensures scores are only awarded to players officially registered in this room.</p>
                            </div>
                            
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '12px' }}>Upload Elimination Screenshots:</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {files.map((file, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '8px', border: '1px dashed #475569' }}>
                                            <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(index, e.target.files[0])} required={index === 0} style={{ flexGrow: 1, color: '#94a3b8' }} />
                                            {files.length > 1 && (
                                                <button type="button" onClick={() => setFiles(files.filter((_, i) => i !== index))} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#ef4444', padding: '6px 12px', marginLeft: '12px' }}>✕</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
                                <button type="button" onClick={() => setFiles([...files, null])} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#334155', color: '#f8fafc', flex: 1 }}>
                                    + Add Another Screenshot
                                </button>
                                <button type="submit" disabled={uploading} className="btn-anim" style={{ ...btnStyle, backgroundColor: '#10b981', flex: 2, fontSize: '1.1rem' }}>
                                    {uploading ? 'Analyzing via OCR...' : 'Generate Verified Leaderboard'}
                                </button>
                            </div>
                        </form>

                        {leaderboard.length > 0 && (
                            <div style={{ marginTop: '40px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.5rem' }}>Final Leaderboard</h3>
                                    <span style={{ backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '20px', fontSize: '0.875rem', border: '1px solid #334155' }}>
                                        {leaderboard.length} Valid Players Scored
                                    </span>
                                </div>
                                
                                <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#0f172a' }}>
                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                        <thead style={{ backgroundColor: '#1e293b' }}>
                                            <tr>
                                                <th style={{ padding: '16px', color: '#94a3b8', fontWeight: '600' }}>Rank</th>
                                                <th style={{ padding: '16px', color: '#94a3b8', fontWeight: '600' }}>Player IGN</th>
                                                <th style={{ padding: '16px', color: '#94a3b8', fontWeight: '600' }}>Kills</th>
                                                <th style={{ padding: '16px', color: '#94a3b8', fontWeight: '600', textAlign: 'right' }}>Total Points</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaderboard.map((player, idx) => (
                                                <tr key={idx} className="list-card" style={{ borderTop: '1px solid #1e293b' }}>
                                                    <td style={{ padding: '16px', fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b' }}>
                                                        #{idx + 1}
                                                    </td>
                                                    <td style={{ padding: '16px', fontWeight: 'bold', color: '#f8fafc' }}>{player.ign || player.player}</td>
                                                    <td style={{ padding: '16px', color: '#cbd5e1' }}>{player.kills}</td>
                                                    <td style={{ padding: '16px', color: '#10b981', fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem' }}>+{player.points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Polished Reusable Styles
const tabBtn = { flex: 1, padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' };
const inputStyle = { padding: '14px 16px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#1e293b', color: 'white', fontSize: '1rem', transition: 'all 0.2s' };
const btnStyle = { padding: '14px 20px', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };