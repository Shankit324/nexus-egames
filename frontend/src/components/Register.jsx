// src/components/Register.jsx
import { useState } from 'react';

export default function Register({ toggleView }) {
    const [formData, setFormData] = useState({ username: '', password: '', ign: '', uid: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Added loading state

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('http://localhost:8000/api/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Registration failed');
            
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-container" style={{ width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* INJECTED CSS FOR HOVERS AND FOCUS STATES */}
            <style>{`
                .register-card {
                    background-color: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 16px;
                    padding: 2.5rem;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.1);
                    color: #f8fafc;
                }
                .register-input {
                    width: 100%;
                    padding: 14px 16px;
                    border-radius: 8px;
                    border: 1px solid #475569;
                    background-color: #0f172a;
                    color: white;
                    font-size: 1rem;
                    transition: all 0.2s;
                    box-sizing: border-box; /* Prevents overflow */
                }
                .register-input:focus {
                    outline: none;
                    border-color: #10b981;
                    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
                }
                .register-btn {
                    width: 100%;
                    padding: 14px;
                    background-color: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-top: 10px;
                }
                .register-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    background-color: #059669;
                }
                .register-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .toggle-link {
                    color: #3b82f6;
                    cursor: pointer;
                    text-decoration: none;
                    font-weight: 600;
                    transition: color 0.2s;
                }
                .toggle-link:hover {
                    color: #60a5fa;
                    text-decoration: underline;
                }
            `}</style>

            <div className="register-card">
                
                {success ? (
                    /* SUCCESS SCREEN */
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '2rem', marginBottom: '16px', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}>
                            ✓
                        </div>
                        <h3 style={{ color: '#10b981', fontSize: '1.75rem', margin: '0 0 8px 0' }}>Account Created!</h3>
                        <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '1.1rem' }}>
                            Welcome to the platform, <strong style={{ color: '#f8fafc' }}>{formData.ign}</strong>.
                        </p>
                        <button onClick={toggleView} className="register-btn" style={{ backgroundColor: '#3b82f6' }}>
                            Proceed to Login
                        </button>
                    </div>
                ) : (
                    /* REGISTRATION FORM */
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#10b981', color: 'white', fontSize: '1.5rem', marginBottom: '1rem', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.4)' }}>
                                🏆
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>Player Sign Up</h2>
                            <p style={{ color: '#94a3b8', margin: 0 }}>Register to start climbing the leaderboard</p>
                        </div>

                        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}>Username</label>
                                    <input type="text" name="username" placeholder="Choose a username" onChange={handleChange} required className="register-input" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}>Password</label>
                                    <input type="password" name="password" placeholder="••••••••" onChange={handleChange} required className="register-input" />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}>Free Fire IGN (In-Game Name)</label>
                                <input type="text" name="ign" placeholder="e.g., NinjaFF" onChange={handleChange} required className="register-input" />
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>This must exactly match your name in Free Fire for scoring.</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}>Free Fire UID</label>
                                <input type="text" name="uid" placeholder="e.g., 12345678" onChange={handleChange} required className="register-input" />
                            </div>

                            {error && (
                                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 12px', borderRadius: '6px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            <button type="submit" className="register-btn" disabled={isLoading}>
                                {isLoading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>
                        
                        <p style={{ marginTop: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>
                            Already have an account? <span onClick={toggleView} className="toggle-link">Log In here</span>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}