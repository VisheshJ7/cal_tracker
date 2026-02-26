import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import {
    Flame, Plus, Trash2, Apple, RefreshCw, Target, TrendingUp, Utensils
} from 'lucide-react';

const DAILY_GOAL = 2000;

export default function Dashboard() {
    const { user } = useAuth();
    const [foodInput, setFoodInput] = useState('');
    const [logs, setLogs] = useState([]);
    const [totalCalories, setTotalCalories] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');
    const [lastAdded, setLastAdded] = useState(null);

    const fetchToday = useCallback(async () => {
        try {
            setFetching(true);
            const { data } = await api.get('/food/today');
            setLogs(data.logs);
            setTotalCalories(data.total_calories);
        } catch (e) {
            console.error(e);
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => { fetchToday(); }, [fetchToday]);

    const handleLog = async (e) => {
        e.preventDefault();
        if (!foodInput.trim()) return;
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/food/log', { food_item: foodInput.trim() });
            setLogs((prev) => [data, ...prev]);
            setTotalCalories((prev) => prev + data.calories);
            setLastAdded(data);
            setFoodInput('');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to log food. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, calories) => {
        try {
            await api.delete(`/food/log/${id}`);
            setLogs((prev) => prev.filter((l) => l.id !== id));
            setTotalCalories((prev) => Math.max(0, prev - calories));
            if (lastAdded?.id === id) setLastAdded(null);
        } catch (e) {
            console.error(e);
        }
    };

    const percentage = Math.min((totalCalories / DAILY_GOAL) * 100, 100);
    const remaining = Math.max(DAILY_GOAL - totalCalories, 0);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const progressColor = percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#6366f1';

    return (
        <div className="app-layout">
            <Navbar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">{today}</p>
                    </div>
                    <button className="icon-btn" onClick={fetchToday} title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card primary">
                        <div className="stat-icon"><Flame size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{totalCalories.toFixed(0)}</span>
                            <span className="stat-label">Calories Today</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon secondary-icon"><Target size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{DAILY_GOAL}</span>
                            <span className="stat-label">Daily Goal</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green-icon"><TrendingUp size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{remaining.toFixed(0)}</span>
                            <span className="stat-label">Remaining</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon orange-icon"><Utensils size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{logs.length}</span>
                            <span className="stat-label">Items Logged</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-card">
                    <div className="progress-header">
                        <span className="progress-label">Daily Progress</span>
                        <span className="progress-pct">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="progress-track">
                        <div
                            className="progress-fill"
                            style={{ width: `${percentage}%`, background: progressColor }}
                        />
                    </div>
                    <div className="progress-footer">
                        <span>{totalCalories.toFixed(0)} kcal consumed</span>
                        <span>{DAILY_GOAL} kcal goal</span>
                    </div>
                </div>

                {/* Food Logger */}
                <div className="logger-card">
                    <h2 className="card-title"><Apple size={20} /> Log Food</h2>
                    <form className="logger-form" onSubmit={handleLog}>
                        <div className="logger-input-wrap">
                            <input
                                type="text"
                                className="logger-input"
                                placeholder="e.g. 1 cup oatmeal, 2 boiled eggs, medium banana..."
                                value={foodInput}
                                onChange={(e) => setFoodInput(e.target.value)}
                                disabled={loading}
                                id="food-input"
                            />
                            <button type="submit" className="logger-btn" disabled={loading || !foodInput.trim()} id="log-food-btn">
                                {loading ? <span className="btn-spinner small" /> : <><Plus size={18} /> Log Food</>}
                            </button>
                        </div>
                        {error && <p className="logger-error">{error}</p>}
                    </form>

                    {lastAdded && (
                        <div className="last-added-banner">
                            ✅ <strong>{lastAdded.food_item}</strong> — {lastAdded.calories.toFixed(0)} kcal
                            <span className="banner-detail"> ({lastAdded.serving_size})</span>
                        </div>
                    )}
                </div>

                {/* Food Log List */}
                <div className="log-card">
                    <h2 className="card-title"><Utensils size={20} /> Today's Food Log</h2>
                    {fetching ? (
                        <div className="loading-state">
                            <span className="btn-spinner large" />
                            <span>Loading today's logs...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="empty-state">
                            <Apple size={40} className="empty-icon" />
                            <p>No food logged yet today.</p>
                            <p className="empty-sub">Start by entering a food item above!</p>
                        </div>
                    ) : (
                        <div className="food-list">
                            {logs.map((log) => (
                                <div key={log.id} className="food-item">
                                    <div className="food-item-left">
                                        <div className="food-dot" />
                                        <div className="food-details">
                                            <span className="food-name">{log.food_item}</span>
                                            <span className="food-meta">{log.serving_size}</span>
                                            {log.notes && <span className="food-notes">{log.notes}</span>}
                                        </div>
                                    </div>
                                    <div className="food-item-right">
                                        <span className="food-cal">{log.calories.toFixed(0)} kcal</span>
                                        <span className="food-time">
                                            {new Date(log.logged_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDelete(log.id, log.calories)}
                                            title="Remove"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
