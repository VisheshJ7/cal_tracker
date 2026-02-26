import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Flame, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Register() {
    const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirm) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await register(form.username, form.email, form.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="bg-orb orb-1" />
            <div className="bg-orb orb-2" />

            <div className="auth-card">
                <div className="auth-logo">
                    <Flame size={36} className="auth-logo-icon" />
                    <h1 className="auth-brand">CalorAI</h1>
                </div>
                <p className="auth-subtitle">Start tracking your nutrition today</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Username</label>
                        <div className="input-icon-wrap">
                            <User size={16} className="input-icon" />
                            <input
                                type="text"
                                name="username"
                                placeholder="johndoe"
                                value={form.username}
                                onChange={handleChange}
                                required
                                minLength={3}
                                id="reg-username"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <div className="input-icon-wrap">
                            <Mail size={16} className="input-icon" />
                            <input
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                                id="reg-email"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="input-icon-wrap">
                            <Lock size={16} className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="Min 6 characters"
                                value={form.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                id="reg-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <div className="input-icon-wrap">
                            <Lock size={16} className="input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="confirm"
                                placeholder="Repeat password"
                                value={form.confirm}
                                onChange={handleChange}
                                required
                                id="reg-confirm"
                            />
                        </div>
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading} id="reg-submit">
                        {loading ? <span className="btn-spinner" /> : 'Create Account'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
