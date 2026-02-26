import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { BarChart3, Calendar, TrendingUp } from 'lucide-react';

const PERIODS = [
    { key: 'weekly', label: 'Weekly', icon: <Calendar size={16} /> },
    { key: 'monthly', label: 'Monthly', icon: <BarChart3 size={16} /> },
    { key: 'yearly', label: 'Yearly', icon: <TrendingUp size={16} /> },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const entry = payload[0].payload;
        return (
            <div className="chart-tooltip">
                <p className="tt-label">{label}</p>
                <p className="tt-value">{payload[0].value.toFixed(0)} <span>kcal</span></p>
                {entry.macros && (
                    <div className="tt-macros">
                        <span>P: {entry.macros.protein.toFixed(0)}g</span>
                        <span>C: {entry.macros.carbs.toFixed(0)}g</span>
                        <span>F: {entry.macros.fats.toFixed(0)}g</span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export default function Reports() {
    const { user } = useAuth();
    const dailyGoal = user?.calorieGoal || 2000;
    const [period, setPeriod] = useState('weekly');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ avg: 0, max: 0, total: 0, avgMacros: { protein: 0, carbs: 0, fats: 0 } });

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const { data: res } = await api.get(`/food/history?period=${period}`);
                const entries = res.entries.map((e) => ({
                    label: e.label,
                    calories: e.total_calories,
                    macros: e.total_macros || { protein: 0, carbs: 0, fats: 0 }
                }));
                setData(entries);
                const nonZero = entries.filter((e) => e.calories > 0);
                const total = entries.reduce((s, e) => s + e.calories, 0);
                const avg = nonZero.length > 0 ? total / nonZero.length : 0;
                const max = Math.max(...entries.map((e) => e.calories), 0);
                const avgMacros = {
                    protein: nonZero.length > 0 ? nonZero.reduce((s, e) => s + e.macros.protein, 0) / nonZero.length : 0,
                    carbs: nonZero.length > 0 ? nonZero.reduce((s, e) => s + e.macros.carbs, 0) / nonZero.length : 0,
                    fats: nonZero.length > 0 ? nonZero.reduce((s, e) => s + e.macros.fats, 0) / nonZero.length : 0
                };
                setStats({ avg, max, total, avgMacros });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [period]);

    return (
        <div className="app-layout">
            <Navbar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Reports</h1>
                        <p className="page-subtitle">Your calorie intake history</p>
                    </div>
                </div>

                {/* Period Tabs */}
                <div className="period-tabs">
                    {PERIODS.map(({ key, label, icon }) => (
                        <button
                            key={key}
                            className={`period-tab ${period === key ? 'active' : ''}`}
                            onClick={() => setPeriod(key)}
                            id={`tab-${key}`}
                        >
                            {icon} {label}
                        </button>
                    ))}
                </div>

                {/* Summary Stats */}
                <div className="report-stats-grid">
                    <div className="report-stat">
                        <span className="rstat-label">Total Intake</span>
                        <span className="rstat-value">{stats.total.toFixed(0)} <span className="rstat-unit">kcal</span></span>
                    </div>
                    <div className="report-stat">
                        <span className="rstat-label">Daily Average</span>
                        <span className="rstat-value">{stats.avg.toFixed(0)} <span className="rstat-unit">kcal</span></span>
                    </div>
                    <div className="report-stat">
                        <span className="rstat-label">Peak Day</span>
                        <span className="rstat-value">{stats.max.toFixed(0)} <span className="rstat-unit">kcal</span></span>
                    </div>
                </div>

                {/* Average Macros */}
                <div className="macros-grid report-macros">
                    <div className="macro-card protein">
                        <span className="macro-label">Avg Protein</span>
                        <span className="macro-value">{stats.avgMacros.protein.toFixed(1)}g</span>
                    </div>
                    <div className="macro-card carbs">
                        <span className="macro-label">Avg Carbs</span>
                        <span className="macro-value">{stats.avgMacros.carbs.toFixed(1)}g</span>
                    </div>
                    <div className="macro-card fats">
                        <span className="macro-label">Avg Fats</span>
                        <span className="macro-value">{stats.avgMacros.fats.toFixed(1)}g</span>
                    </div>
                </div>

                {/* Chart */}
                <div className="chart-card">
                    <h2 className="card-title">{PERIODS.find(p => p.key === period)?.label} Calorie History</h2>
                    {loading ? (
                        <div className="loading-state"><span className="btn-spinner large" /><span>Loading chart...</span></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            {period === 'yearly' ? (
                                <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="calories" stroke="#6366f1" strokeWidth={2} fill="url(#calGrad)" dot={{ fill: '#6366f1', r: 4 }} />
                                </AreaChart>
                            ) : (
                                <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={entry.calories > dailyGoal ? '#ef4444' : entry.calories > dailyGoal * 0.8 ? '#f59e0b' : '#6366f1'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    )}

                    {!loading && (
                        <div className="chart-legend">
                            <span className="legend-item">
                                <span className="legend-dot" style={{ background: '#6366f1' }} /> Under goal
                            </span>
                            <span className="legend-item">
                                <span className="legend-dot" style={{ background: '#f59e0b' }} /> 80–100% of goal
                            </span>
                            <span className="legend-item">
                                <span className="legend-dot" style={{ background: '#ef4444' }} /> Over goal
                            </span>
                        </div>
                    )}
                </div>

                {/* Data Table */}
                {!loading && data.length > 0 && (
                    <div className="data-table-card">
                        <h2 className="card-title">Breakdown</h2>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Period</th>
                                    <th>Calories</th>
                                    <th>Macros</th>
                                    <th>vs Goal</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, i) => {
                                    const diff = row.calories - dailyGoal;
                                    const pct = row.calories > 0 ? ((row.calories / dailyGoal) * 100).toFixed(1) : '0.0';
                                    const status = row.calories === 0 ? 'No Data' : diff > 0 ? 'Over' : 'Under';
                                    const statusClass = row.calories === 0 ? 'no-data' : diff > 0 ? 'over' : 'under';
                                    return (
                                        <tr key={i}>
                                            <td>{row.label}</td>
                                            <td><strong>{row.calories.toFixed(0)}</strong> kcal</td>
                                            <td>
                                                <span className="macro-mini">P: {row.macros.protein.toFixed(0)}g</span>
                                                <span className="macro-mini">C: {row.macros.carbs.toFixed(0)}g</span>
                                                <span className="macro-mini">F: {row.macros.fats.toFixed(0)}g</span>
                                            </td>
                                            <td>{pct}%</td>
                                            <td><span className={`status-badge ${statusClass}`}>{status}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
