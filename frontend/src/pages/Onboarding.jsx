import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Flame, User, Activity, Target, ArrowRight, ArrowLeft, Check, Scale, Ruler, TrendingDown, TrendingUp } from 'lucide-react';

const ACTIVITY_LEVELS = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise, desk job' },
    { value: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
    { value: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
    { value: 'active', label: 'Active', desc: 'Hard exercise 6-7 days/week' },
    { value: 'very_active', label: 'Very Active', desc: 'Hard daily exercise or physical job' },
];

const GOALS = [
    { value: 'lose', label: 'Lose Weight', desc: 'Create a calorie deficit to lose fat', icon: '📉' },
    { value: 'maintain', label: 'Maintain Weight', desc: 'Keep your current weight stable', icon: '⚖️' },
    { value: 'gain', label: 'Gain Weight', desc: 'Build muscle with a calorie surplus', icon: '📈' },
];

const WEIGHT_CHANGE_OPTIONS = [
    { value: 0.25, label: '0.25 kg/week', desc: 'Slow and steady', intensity: 'Easy' },
    { value: 0.5, label: '0.5 kg/week', desc: 'Recommended pace', intensity: 'Moderate' },
    { value: 0.75, label: '0.75 kg/week', desc: 'Faster progress', intensity: 'Challenging' },
    { value: 1.0, label: '1 kg/week', desc: 'Aggressive approach', intensity: 'Intense' },
];

export default function Onboarding() {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        gender: 'male',
        age: '',
        height: '',
        weight: '',
        activity_level: 'moderate',
        goal: 'maintain',
        weight_change_per_week: 0.5
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const { completeOnboarding } = useAuth();
    const navigate = useNavigate();

    // Dynamic steps based on goal
    const getSteps = () => {
        if (form.goal === 'maintain') {
            return ['profile', 'activity', 'goal', 'result'];
        }
        return ['profile', 'activity', 'goal', 'weight_change', 'result'];
    };
    
    const STEPS = getSteps();
    const currentStepName = STEPS[step];

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const canProceed = () => {
        if (currentStepName === 'profile') {
            return form.gender && form.age && form.height && form.weight;
        }
        if (currentStepName === 'activity') return form.activity_level;
        if (currentStepName === 'goal') return form.goal;
        if (currentStepName === 'weight_change') return form.weight_change_per_week;
        return true;
    };

    const isSubmitStep = () => {
        // Submit on goal step if maintain, otherwise on weight_change step
        if (form.goal === 'maintain') {
            return currentStepName === 'goal';
        }
        return currentStepName === 'weight_change';
    };

    const handleNext = async () => {
        if (!isSubmitStep()) {
            setStep(step + 1);
        } else {
            // Submit to backend
            setLoading(true);
            setError('');
            try {
                const data = await completeOnboarding({
                    gender: form.gender,
                    age: parseInt(form.age),
                    height: parseFloat(form.height),
                    weight: parseFloat(form.weight),
                    activity_level: form.activity_level,
                    goal: form.goal,
                    weight_change_per_week: form.goal === 'maintain' ? 0 : form.weight_change_per_week
                });
                setResult(data);
                setStep(step + 1);
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to save. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleFinish = () => {
        navigate('/');
    };

    return (
        <div className="auth-page onboarding-page">
            <div className="bg-orb orb-1" />
            <div className="bg-orb orb-2" />

            <div className="onboarding-card">
                <div className="auth-logo">
                    <Flame size={36} className="auth-logo-icon" />
                    <h1 className="auth-brand">CalorAI</h1>
                </div>

                {/* Progress indicator */}
                <div className="onboarding-progress">
                    {STEPS.map((s, i) => (
                        <div key={s} className={`progress-step ${i <= step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
                            {i < step ? <Check size={14} /> : i + 1}
                        </div>
                    ))}
                </div>

                {error && <div className="auth-error">{error}</div>}

                {/* Step: Profile Info */}
                {currentStepName === 'profile' && (
                    <div className="onboarding-step">
                        <h2 className="step-title">Tell us about yourself</h2>
                        <p className="step-desc">We'll use this to calculate your daily calorie needs</p>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Gender</label>
                                <div className="gender-toggle">
                                    <button
                                        type="button"
                                        className={`gender-btn ${form.gender === 'male' ? 'active' : ''}`}
                                        onClick={() => setForm({ ...form, gender: 'male' })}
                                    >
                                        Male
                                    </button>
                                    <button
                                        type="button"
                                        className={`gender-btn ${form.gender === 'female' ? 'active' : ''}`}
                                        onClick={() => setForm({ ...form, gender: 'female' })}
                                    >
                                        Female
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Age</label>
                                <div className="input-icon-wrap">
                                    <User size={16} className="input-icon" />
                                    <input
                                        type="number"
                                        name="age"
                                        placeholder="25"
                                        value={form.age}
                                        onChange={handleChange}
                                        min={10}
                                        max={120}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Height (cm)</label>
                                <div className="input-icon-wrap">
                                    <Ruler size={16} className="input-icon" />
                                    <input
                                        type="number"
                                        name="height"
                                        placeholder="170"
                                        value={form.height}
                                        onChange={handleChange}
                                        min={100}
                                        max={250}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Weight (kg)</label>
                                <div className="input-icon-wrap">
                                    <Scale size={16} className="input-icon" />
                                    <input
                                        type="number"
                                        name="weight"
                                        placeholder="70"
                                        value={form.weight}
                                        onChange={handleChange}
                                        min={30}
                                        max={300}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step: Activity Level */}
                {currentStepName === 'activity' && (
                    <div className="onboarding-step">
                        <h2 className="step-title">How active are you?</h2>
                        <p className="step-desc">This helps us estimate your daily calorie burn</p>

                        <div className="activity-options">
                            {ACTIVITY_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    type="button"
                                    className={`activity-option ${form.activity_level === level.value ? 'active' : ''}`}
                                    onClick={() => setForm({ ...form, activity_level: level.value })}
                                >
                                    <span className="activity-label">{level.label}</span>
                                    <span className="activity-desc">{level.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step: Goal */}
                {currentStepName === 'goal' && (
                    <div className="onboarding-step">
                        <h2 className="step-title">What's your goal?</h2>
                        <p className="step-desc">We'll adjust your calorie target accordingly</p>

                        <div className="goal-options">
                            {GOALS.map((g) => (
                                <button
                                    key={g.value}
                                    type="button"
                                    className={`goal-option ${form.goal === g.value ? 'active' : ''}`}
                                    onClick={() => setForm({ ...form, goal: g.value })}
                                >
                                    <span className="goal-icon">{g.icon}</span>
                                    <div className="goal-text">
                                        <span className="goal-label">{g.label}</span>
                                        <span className="goal-desc">{g.desc}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step: Weight Change Rate */}
                {currentStepName === 'weight_change' && (
                    <div className="onboarding-step">
                        <h2 className="step-title">
                            {form.goal === 'lose' ? 'How fast do you want to lose weight?' : 'How fast do you want to gain weight?'}
                        </h2>
                        <p className="step-desc">Choose a pace that fits your lifestyle</p>

                        <div className="weight-change-options">
                            {WEIGHT_CHANGE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`weight-change-option ${form.weight_change_per_week === option.value ? 'active' : ''}`}
                                    onClick={() => setForm({ ...form, weight_change_per_week: option.value })}
                                >
                                    <div className="weight-change-main">
                                        {form.goal === 'lose' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                                        <span className="weight-change-label">{option.label}</span>
                                    </div>
                                    <div className="weight-change-meta">
                                        <span className="weight-change-desc">{option.desc}</span>
                                        <span className={`weight-change-intensity ${option.intensity.toLowerCase()}`}>
                                            {option.intensity}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step: Result */}
                {currentStepName === 'result' && result && (
                    <div className="onboarding-step result-step">
                        <div className="result-icon">🎯</div>
                        <h2 className="step-title">Your personalized plan is ready!</h2>
                        
                        <div className="result-cards">
                            <div className="result-card">
                                <span className="result-label">Maintenance Calories</span>
                                <span className="result-value">{result.maintenance_calories}</span>
                                <span className="result-unit">kcal/day</span>
                            </div>
                            <div className="result-card primary">
                                <span className="result-label">Your Daily Goal</span>
                                <span className="result-value">{result.calorie_goal}</span>
                                <span className="result-unit">kcal/day</span>
                            </div>
                        </div>

                        {result.weekly_change > 0 && (
                            <div className="result-weekly-change">
                                <span className="weekly-change-label">
                                    {form.goal === 'lose' ? '📉 Weekly target loss:' : '📈 Weekly target gain:'}
                                </span>
                                <span className="weekly-change-value">{result.weekly_change} kg/week</span>
                            </div>
                        )}

                        <p className="result-note">
                            {form.goal === 'lose' && `This ${Math.round(result.maintenance_calories - result.calorie_goal)} kcal deficit will help you lose weight safely.`}
                            {form.goal === 'maintain' && "This keeps you at your current weight."}
                            {form.goal === 'gain' && `This ${Math.round(result.calorie_goal - result.maintenance_calories)} kcal surplus supports muscle growth.`}
                        </p>
                    </div>
                )}

                {/* Navigation */}
                <div className="onboarding-nav">
                    {step > 0 && currentStepName !== 'result' && (
                        <button type="button" className="nav-btn back" onClick={handleBack}>
                            <ArrowLeft size={18} /> Back
                        </button>
                    )}
                    {currentStepName !== 'result' ? (
                        <button 
                            type="button" 
                            className="nav-btn next" 
                            onClick={handleNext}
                            disabled={!canProceed() || loading}
                        >
                            {loading ? <span className="btn-spinner" /> : (
                                <>
                                    {isSubmitStep() ? 'Calculate' : 'Next'} <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    ) : (
                        <button type="button" className="nav-btn finish" onClick={handleFinish}>
                            Start Tracking <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
