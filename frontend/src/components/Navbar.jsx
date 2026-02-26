import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, BarChart3, MessageSquare, LogOut, Flame, Dumbbell } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/exercise', icon: <Dumbbell size={20} />, label: 'Exercise' },
        { to: '/reports', icon: <BarChart3 size={20} />, label: 'Reports' },
        { to: '/chat', icon: <MessageSquare size={20} />, label: 'AI Chat' },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Flame size={24} className="navbar-logo-icon" />
                <span className="navbar-logo-text">CalorAI</span>
            </div>

            <div className="navbar-links">
                {navItems.map(({ to, icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        {icon}
                        <span>{label}</span>
                    </NavLink>
                ))}
            </div>

            <div className="navbar-footer">
                <div className="nav-user">
                    <div className="nav-avatar">{user?.username?.[0]?.toUpperCase()}</div>
                    <span className="nav-username">{user?.username}</span>
                </div>
                <button className="nav-logout" onClick={handleLogout} title="Logout">
                    <LogOut size={18} />
                </button>
            </div>
        </nav>
    );
}
