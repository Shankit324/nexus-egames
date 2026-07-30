// src/App.jsx
import { useState, useEffect } from 'react';
import HostDashboard from './components/HostDashboard';
import PlayerDashboard from './components/PlayerDashboard';
import Login from './components/Login';
import Register from './components/Register';
import { apiFetch } from './utils/api'; 

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [showRegister, setShowRegister] = useState(false);
  
  // States for managing user data
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setProfile(null);
  };

  // Fetch profile whenever a token exists
  useEffect(() => {
    if (!token) {
        return;
    }

    const fetchProfile = async () => {
        setLoadingProfile(true);
        try {
            const response = await apiFetch('/api/profile/');

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
            } else if (response.status === 401) {
                handleLogout();
            }
        } catch (error) {
            console.error("Failed to fetch profile", error);
        } finally {
            setLoadingProfile(false);
        }
    };

    fetchProfile();
  }, [token]);

  // Global styles for animations and layout
  const globalStyles = (
    <style>{`
      body {
        margin: 0;
        background-color: #0f172a;
        color: #e2e8f0;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .app-wrapper {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background-color: #0f172a;
      }
      .btn-anim { transition: all 0.2s ease; }
      .btn-anim:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      .btn-anim:active { transform: translateY(0); }
      
      .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(59, 130, 246, 0.2);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { 100% { transform: rotate(360deg); } }
      .pulse-text { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
    `}</style>
  );

  // 1. If not logged in, show Auth screens perfectly centered
  if (!token) {
    return (
      <div className="app-wrapper" style={{ justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        {globalStyles}
        <div style={{ width: '100%', maxWidth: '450px' }}>
          {showRegister ? (
            <Register toggleView={() => setShowRegister(false)} />
          ) : (
            <div style={{ width: '100%' }}>
              <Login setToken={setToken} />
              <p style={{ textAlign: 'center', marginTop: '20px', color: '#94a3b8', fontSize: '0.95rem' }}>
                New player? <span onClick={() => setShowRegister(true)} style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#60a5fa'} onMouseOut={(e) => e.target.style.color = '#3b82f6'}>Sign up here</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. If logged in but data is still fetching, show a premium loading state
  if (loadingProfile || !profile) {
      return (
        <div className="app-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
          {globalStyles}
          <div className="spinner"></div>
          <p className="pulse-text" style={{ marginTop: '24px', color: '#94a3b8', fontSize: '1.1rem', fontWeight: '500', letterSpacing: '1px' }}>
            Syncing Profile Data...
          </p>
        </div>
      );
  }

  // 3. Render the correct dashboard based on the user's role
  return (
    <div className="app-wrapper">
      {globalStyles}
      
      {/* PREMIUM NAVIGATION BAR */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 32px', 
        backgroundColor: 'rgba(30, 41, 59, 0.8)', 
        backdropFilter: 'blur(12px)', 
        borderBottom: '1px solid #334155',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)' }}>
            🎮
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '1px' }}>NEXUS ESPORTS</h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
              {profile.is_host ? 'Host Module' : 'Player Module'}
            </span>
          </div>
        </div>
        
        <button 
          onClick={handleLogout} 
          className="btn-anim"
          style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}
        >
          Sign Out
        </button>
      </nav>
      
      {/* MAIN CONTENT AREA */}
      <main style={{ padding: '20px 0', flexGrow: 1 }}>
        {profile.is_host ? (
            <HostDashboard /> 
        ) : (
            <PlayerDashboard profile={profile} />
        )}
      </main>
    </div>
  );
}

export default App;