import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import {
    Flame, Plus, Trash2, Apple, RefreshCw, Target, TrendingUp, Utensils, Settings, X, Dumbbell, Minus
} from 'lucide-react';

export default function Dashboard() {
    const { user, updateSettings } = useAuth();
    const [foodInput, setFoodInput] = useState('');
    const [logs, setLogs] = useState([]);
    const [totalCalories, setTotalCalories] = useState(0);
    const [totalMacros, setTotalMacros] = useState({ protein: 0, carbs: 0, fats: 0 });
    const [caloriesBurnt, setCaloriesBurnt] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');
    const [lastAdded, setLastAdded] = useState(null);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [newGoal, setNewGoal] = useState(user?.calorieGoal || 2000);
    const [savingGoal, setSavingGoal] = useState(false);

    const dailyGoal = user?.calorieGoal || 2000;

    const fetchToday = useCallback(async () => {
        try {
            setFetching(true);
            const [foodRes, exerciseRes] = await Promise.all([
                api.get('/food/today'),
                api.get('/exercises/today')
            ]);
            setLogs(foodRes.data.logs);
            setTotalCalories(foodRes.data.total_calories);
            setTotalMacros(foodRes.data.total_macros || { protein: 0, carbs: 0, fats: 0 });
            setCaloriesBurnt(exerciseRes.data.total_calories_burnt);
        } catch (e) {
            console.error(e);
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => { fetchToday(); }, [fetchToday]);

    const handleSaveGoal = async () => {
        if (newGoal < 500 || newGoal > 10000) return;
        setSavingGoal(true);
        try {
            await updateSettings(newGoal);
            setShowGoalModal(false);
        } catch (e) {
            console.error(e);
        } finally {
            setSavingGoal(false);
        }
    };

    const handleLog = async (e) => {
        e.preventDefault();
        if (!foodInput.trim()) return;
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/food/log', { food_item: foodInput.trim() });
            setLogs((prev) => [data, ...prev]);
            setTotalCalories((prev) => prev + data.calories);
            setTotalMacros((prev) => ({
                protein: prev.protein + (data.protein || 0),
                carbs: prev.carbs + (data.carbs || 0),
                fats: prev.fats + (data.fats || 0)
            }));
            setLastAdded(data);
            setFoodInput('');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to log food. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, calories, protein = 0, carbs = 0, fats = 0) => {
        try {
            await api.delete(`/food/log/${id}`);
            setLogs((prev) => prev.filter((l) => l.id !== id));
            setTotalCalories((prev) => Math.max(0, prev - calories));
            setTotalMacros((prev) => ({
                protein: Math.max(0, prev.protein - protein),
                carbs: Math.max(0, prev.carbs - carbs),
                fats: Math.max(0, prev.fats - fats)
            }));
            if (lastAdded?.id === id) setLastAdded(null);
        } catch (e) {
            console.error(e);
        }
    };

    const netCalories = totalCalories - caloriesBurnt;
    const percentage = Math.min((netCalories / dailyGoal) * 100, 100);
    const remaining = Math.max(dailyGoal - netCalories, 0);
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
                            <span className="stat-label">Consumed</span>
                        </div>
                    </div>
                    <div className="stat-card burnt-card">
                        <div className="stat-icon burnt-icon"><Dumbbell size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value flex-value">
                                <Minus size={14} className="minus-sign" /> {caloriesBurnt.toFixed(0)}
                            </span>
                            <span className="stat-label">Burnt</span>
                        </div>
                    </div>
                    <div className="stat-card net-card">
                        <div className="stat-icon net-icon"><TrendingUp size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{netCalories.toFixed(0)}</span>
                            <span className="stat-label">Net Calories</span>
                        </div>
                    </div>
                    <div className="stat-card clickable" onClick={() => { setNewGoal(dailyGoal); setShowGoalModal(true); }}>
                        <div className="stat-icon secondary-icon"><Target size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{dailyGoal}</span>
                            <span className="stat-label">Goal <Settings size={12} style={{ marginLeft: 4, opacity: 0.6 }} /></span>
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

                {/* Macros Summary */}
                <div className="macros-grid">
                    <div className="macro-card protein">
                        <span className="macro-label">Protein</span>
                        <span className="macro-value">{totalMacros.protein.toFixed(1)}g</span>
                    </div>
                    <div className="macro-card carbs">
                        <span className="macro-label">Carbs</span>
                        <span className="macro-value">{totalMacros.carbs.toFixed(1)}g</span>
                    </div>
                    <div className="macro-card fats">
                        <span className="macro-label">Fats</span>
                        <span className="macro-value">{totalMacros.fats.toFixed(1)}g</span>
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
                        <span>{netCalories.toFixed(0)} kcal net ({totalCalories.toFixed(0)} - {caloriesBurnt.toFixed(0)})</span>
                        <span>{dailyGoal} kcal goal</span>
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
                                            <span className="food-macros">
                                                P: {(log.protein || 0).toFixed(1)}g • C: {(log.carbs || 0).toFixed(1)}g • F: {(log.fats || 0).toFixed(1)}g
                                            </span>
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
                                            onClick={() => handleDelete(log.id, log.calories, log.protein, log.carbs, log.fats)}
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

                {/* Goal Edit Modal */}
                {showGoalModal && (
                    <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Edit Daily Goal</h3>
                                <button className="modal-close" onClick={() => setShowGoalModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <label>Daily Calorie Goal</label>
                                <input
                                    type="number"
                                    value={newGoal}
                                    onChange={(e) => setNewGoal(parseInt(e.target.value) || 0)}
                                    min={500}
                                    max={10000}
                                    className="goal-input"
                                />
                                <span className="form-hint">Recommended: 1500-3000 kcal depending on your goals</span>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setShowGoalModal(false)}>Cancel</button>
                                <button className="btn-primary" onClick={handleSaveGoal} disabled={savingGoal}>
                                    {savingGoal ? <span className="btn-spinner small" /> : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
