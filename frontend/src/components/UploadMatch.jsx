// src/components/UploadMatch.jsx
import { useState } from 'react';
import { apiFetch } from '../utils/api';

export default function UploadMatch() {
    // State is now an array starting with one empty slot
    const [files, setFiles] = useState([null]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Updates a specific file input in the array
    const handleFileChange = (index, selectedFile) => {
        const newFiles = [...files];
        newFiles[index] = selectedFile;
        setFiles(newFiles);
    };

    // Adds a new empty file input row
    const addFileInput = () => {
        setFiles([...files, null]);
    };

    // Removes a file input row
    const removeFileInput = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        // Filter out any slots where the user didn't actually select a file
        const validFiles = files.filter(file => file !== null);
        if (validFiles.length === 0) return;

        setLoading(true);
        setError(null);
        
        const formData = new FormData();
        // Append all files to the same key 'files' so Django gets a list
        validFiles.forEach((file) => {
            formData.append('files', file); 
        });

        try {
            const response = await apiFetch('/api/upload-results/', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                if (response.status === 401) throw new Error("Unauthorized. Please log in again.");
                throw new Error("Server failed to process images.");
            }

            const data = await response.json();
            setLeaderboard(data.leaderboard);
        } catch (err) {
            console.error("Error uploading files:", err);
            setError(err.message || "Failed to analyze screenshots. Ensure Django is running.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-container" style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 15px', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* INJECTED CSS FOR FILE INPUTS AND HOVERS */}
            <style>{`
                .upload-card {
                    background-color: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 16px;
                    padding: 2rem;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.1);
                }
                .file-input-custom {
                    width: 100%;
                    padding: 10px;
                    background-color: #0f172a;
                    border: 1px dashed #475569;
                    border-radius: 8px;
                    color: #94a3b8;
                    transition: border-color 0.2s;
                }
                .file-input-custom:hover {
                    border-color: #3b82f6;
                }
                .file-input-custom::file-selector-button {
                    background-color: #334155;
                    color: #f8fafc;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-right: 16px;
                    font-weight: 600;
                    transition: background-color 0.2s ease;
                }
                .file-input-custom::file-selector-button:hover {
                    background-color: #475569;
                }
                .btn-anim { transition: all 0.2s ease; }
                .btn-anim:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .btn-anim:active:not(:disabled) { transform: translateY(0); }
                .btn-anim:disabled { opacity: 0.6; cursor: not-allowed; }
                .pulse-text { animation: pulse 1.5s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                .rank-row:hover { background-color: #2dd4bf0a; }
            `}</style>

            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '2rem', marginBottom: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    📸
                </div>
                <h2 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Process Match Results
                </h2>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '1.1rem' }}>Upload final elimination screenshots to generate the official leaderboard.</p>
            </div>
            
            <form onSubmit={handleUpload} className="upload-card" style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', color: '#f8fafc' }}>Elimination Screens</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {files.map((file, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={(e) => handleFileChange(index, e.target.files[0])}
                                required={index === 0}
                                className="file-input-custom"
                            />
                            
                            {files.length > 1 && (
                                <button 
                                    type="button" 
                                    onClick={() => removeFileInput(index)}
                                    className="btn-anim"
                                    title="Remove Image"
                                    style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {error && (
                    <div style={{ marginTop: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '16px', marginTop: '24px', borderTop: '1px solid #334155', paddingTop: '24px' }}>
                    <button 
                        type="button" 
                        onClick={addFileInput}
                        className="btn-anim"
                        style={{ flex: 1, padding: '14px', backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}
                    >
                        + Add Another Screenshot
                    </button>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="btn-anim"
                        style={{ flex: 2, padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                        {loading ? <span className="pulse-text">⚙️ Analyzing Images via OCR...</span> : "Generate Leaderboard"}
                    </button>
                </div>
            </form>

            {/* LEADERBOARD RESULTS */}
            {leaderboard.length > 0 && (
                <div className="upload-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>🏆</span> Final Match Standings
                        </h3>
                        <span style={{ backgroundColor: '#0f172a', padding: '6px 16px', borderRadius: '20px', border: '1px solid #334155', fontSize: '0.9rem', color: '#94a3b8' }}>
                            {leaderboard.length} Players Scored
                        </span>
                    </div>

                    <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#0f172a' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: '#1e293b' }}>
                                <tr>
                                    <th style={{ padding: '16px', color: '#94a3b8', fontWeight: '600' }}>Rank</th>
                                    <th style={{ padding: '16px', color: '#94a3b8', fontWeight: '600' }}>Player IGN</th>
                                    <th style={{ padding: '16px', color: '#94a3b8', fontWeight: '600' }}>Total Kills</th>
                                    <th style={{ padding: '16px', color: '#94a3b8', fontWeight: '600', textAlign: 'right' }}>Total Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((player, index) => {
                                    // Determine rank coloring
                                    const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#64748b';
                                    
                                    return (
                                        <tr key={index} className="rank-row" style={{ borderTop: '1px solid #1e293b', transition: 'background-color 0.2s' }}>
                                            <td style={{ padding: '16px', fontWeight: 'bold', color: rankColor }}>
                                                #{index + 1}
                                            </td>
                                            <td style={{ padding: '16px', fontWeight: 'bold', color: '#f8fafc' }}>
                                                {player.player || player.ign}
                                            </td>
                                            <td style={{ padding: '16px', color: '#cbd5e1' }}>
                                                {player.kills}
                                            </td>
                                            <td style={{ padding: '16px', color: '#10b981', fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem' }}>
                                                +{player.points || player.points_awarded}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}