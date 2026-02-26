import { useState, useEffect, useRef } from 'react';
import { Flame, Search, Clock, Trash2, Dumbbell, TrendingUp, Activity, Zap, Plus } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function Exercise() {
    const [exercises, setExercises] = useState([]);
    const [todayLogs, setTodayLogs] = useState([]);
    const [totalBurnt, setTotalBurnt] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [duration, setDuration] = useState('');
    const [loading, setLoading] = useState(false);
    const [logging, setLogging] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [error, setError] = useState('');
    const dropdownRef = useRef(null);

    // Fetch exercises on search
    useEffect(() => {
        const fetchExercises = async () => {
            try {
                const res = await api.get('/exercises/list', { params: { search: searchQuery } });
                setExercises(res.data);
            } catch (err) {
                console.error('Failed to fetch exercises:', err);
            }
        };
        
        const debounce = setTimeout(fetchExercises, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    // Fetch today's exercise logs
    const fetchTodayLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/exercises/today');
            setTodayLogs(res.data.logs);
            setTotalBurnt(res.data.total_calories_burnt);
        } catch (err) {
            console.error('Failed to fetch today logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTodayLogs();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectExercise = (exercise) => {
        setSelectedExercise(exercise);
        setSearchQuery(exercise.name);
        setShowDropdown(false);
    };

    const handleLogExercise = async () => {
        if (!selectedExercise || !duration || parseFloat(duration) <= 0) {
            setError('Please select an exercise and enter a valid duration');
            return;
        }

        setLogging(true);
        setError('');
        try {
            await api.post('/exercises/log', {
                exercise_name: selectedExercise.name,
                duration_minutes: parseFloat(duration)
            });
            // Reset form
            setSelectedExercise(null);
            setSearchQuery('');
            setDuration('');
            // Refresh logs
            await fetchTodayLogs();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to log exercise');
        } finally {
            setLogging(false);
        }
    };

    const handleDeleteLog = async (logId) => {
        try {
            await api.delete(`/exercises/log/${logId}`);
            await fetchTodayLogs();
        } catch (err) {
            console.error('Failed to delete log:', err);
        }
    };

    const formatTime = (dateStr) => {
        // Handle SQLite datetime format (YYYY-MM-DD HH:MM:SS)
        const date = new Date(dateStr.replace(' ', 'T') + 'Z');
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Estimate calories for preview
    const estimatedCalories = selectedExercise && duration
        ? Math.round(70 * selectedExercise.calories_per_kg_per_hour * (parseFloat(duration) / 60)) // Assume 70kg for preview
        : 0;

    return (
        <div className="app-layout">
            <Navbar />
            <main className="main-content">
                <div className="exercise-page">
                    <header className="page-header">
                        <div className="header-title">
                            <Dumbbell size={28} className="header-icon" />
                            <h1>Exercise Tracker</h1>
                        </div>
                        <p className="header-subtitle">Log your workouts and track calories burnt</p>
                    </header>

            {/* Stats Cards */}
            <div className="exercise-stats">
                <div className="stat-card burnt">
                    <div className="stat-icon">
                        <Flame size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Calories Burnt Today</span>
                        <span className="stat-value">{Math.round(totalBurnt)}</span>
                    </div>
                </div>
                <div className="stat-card sessions">
                    <div className="stat-icon">
                        <Activity size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Sessions Today</span>
                        <span className="stat-value">{todayLogs.length}</span>
                    </div>
                </div>
                <div className="stat-card duration">
                    <div className="stat-icon">
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Total Duration</span>
                        <span className="stat-value">
                            {Math.round(todayLogs.reduce((sum, l) => sum + l.duration_minutes, 0))} min
                        </span>
                    </div>
                </div>
            </div>

            {/* Log Exercise Form */}
            <div className="exercise-logger card">
                <h2 className="card-title">
                    <Plus size={20} /> Log Exercise
                </h2>
                
                {error && <div className="exercise-error">{error}</div>}

                <div className="exercise-form">
                    <div className="exercise-search-wrap" ref={dropdownRef}>
                        <div className="search-input-wrap">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search exercises (e.g., Running, Swimming...)"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setSelectedExercise(null);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                className="exercise-search-input"
                            />
                        </div>
                        
                        {showDropdown && exercises.length > 0 && (
                            <div className="exercise-dropdown">
                                {exercises.map((ex, idx) => (
                                    <button
                                        key={idx}
                                        className="exercise-option"
                                        onClick={() => handleSelectExercise(ex)}
                                    >
                                        <span className="exercise-name">{ex.name}</span>
                                        <span className="exercise-cal">
                                            ~{Math.round(ex.calories_per_kg_per_hour * 70)} kcal/hr
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="duration-input-wrap">
                        <Clock size={18} className="duration-icon" />
                        <input
                            type="number"
                            placeholder="Duration"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            min={1}
                            className="duration-input"
                        />
                        <span className="duration-unit">min</span>
                    </div>

                    <button
                        className="log-exercise-btn"
                        onClick={handleLogExercise}
                        disabled={!selectedExercise || !duration || logging}
                    >
                        {logging ? (
                            <span className="btn-spinner" />
                        ) : (
                            <>
                                <Zap size={18} />
                                Log Exercise
                            </>
                        )}
                    </button>
                </div>

                {selectedExercise && duration && (
                    <div className="calorie-preview">
                        <TrendingUp size={16} />
                        <span>Estimated burn: <strong>~{estimatedCalories} kcal</strong> (varies by weight)</span>
                    </div>
                )}
            </div>

            {/* Today's Exercise Log */}
            <div className="exercise-log card">
                <h2 className="card-title">
                    <Activity size={20} /> Today's Workouts
                </h2>

                {loading ? (
                    <div className="loading-state">Loading...</div>
                ) : todayLogs.length === 0 ? (
                    <div className="empty-state">
                        <Dumbbell size={48} className="empty-icon" />
                        <p>No exercises logged today</p>
                        <span>Start your workout and log it above!</span>
                    </div>
                ) : (
                    <div className="exercise-list">
                        {todayLogs.map((log) => (
                            <div key={log.id} className="exercise-item">
                                <div className="exercise-item-main">
                                    <div className="exercise-item-icon">
                                        <Dumbbell size={20} />
                                    </div>
                                    <div className="exercise-item-info">
                                        <span className="exercise-item-name">{log.exercise_name}</span>
                                        <span className="exercise-item-meta">
                                            <Clock size={12} /> {log.duration_minutes} min • {formatTime(log.logged_at)}
                                        </span>
                                    </div>
                                </div>
                                <div className="exercise-item-right">
                                    <span className="exercise-item-calories">
                                        <Flame size={14} />
                                        {Math.round(log.calories_burnt)} kcal
                                    </span>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDeleteLog(log.id)}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </div>
            </div>
            </main>
        </div>
    );
}
