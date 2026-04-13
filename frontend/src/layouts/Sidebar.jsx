import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';
import {
    Home,
    User as UserIcon,
    Building,
    PlusCircle,
    Activity,
    ArrowUpRight,
    Bell,
    Key,
    LogOut,
    ChevronLeft,
    Menu,
    Search,
    Shield,
    FileText,
    ArrowLeftRight
} from 'lucide-react';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isPathActive = (path) => location.pathname === path;
    const isPathStartsWith = (prefix) => location.pathname.startsWith(prefix);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // ── Nav Item ──
    const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
        <button
            onClick={onClick}
            className={`user-nav-item ${active ? 'active' : ''}`}
        >
            <div className={`nav-content ${isCollapsed ? 'centered' : ''}`}>
                <Icon size={18} />
                {!isCollapsed && <span>{label}</span>}
            </div>
            {isCollapsed && <div className="user-tip">{label}</div>}
            {!isCollapsed && badge > 0 && (
                <div className="user-nav-badge">{badge}</div>
            )}
        </button>
    );

    // ── Section ──
    const NavSection = ({ title, children, divider = true }) => (
        <div className={`user-nav-section ${divider ? 'with-divider' : ''}`}>
            {!isCollapsed && title && (
                <div className="user-section-title">{title}</div>
            )}
            {children}
        </div>
    );

    return (
        <div className="flex" style={{ background: 'hsl(var(--color-bg-base))', minHeight: '100vh' }}>
            {/* ── Sidebar ── */}
            <aside className={`user-sidebar ${isCollapsed ? 'user-sidebar-collapsed' : 'user-sidebar-expanded'}`}
                style={{ position: 'fixed', left: 0, top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>

                {/* Logo */}
                <div className="user-topbar">
                    <div className={`user-logo-box ${isCollapsed ? 'collapsed' : ''}`}>
                        <div className="user-logo-icon">
                            <img src="/logo.png" alt="Digiverify" style={{ width: 24, height: 24 }} />
                        </div>
                        <div className="user-logo-text">
                            <span className="title">Digi<span className="accent">verify</span></span>
                            <span className="subtitle">Platform</span>
                        </div>
                    </div>
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="user-collapse-btn">
                        {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {/* Status */}
                {!isCollapsed && (
                    <div className="user-status-bar">
                        <div className="user-status-dot"></div>
                        <span className="user-status-label">Network Active</span>
                    </div>
                )}

                {/* Navigation */}
                <div className="user-nav-scroll">
                    <NavSection divider={true}>
                        <NavItem
                            icon={Home}
                            label="Dashboard"
                            active={location.pathname === '/dashboard' && !location.search}
                            onClick={() => navigate('/dashboard')}
                        />
                    </NavSection>

                    <NavSection title="Identity" divider={true}>
                        <NavItem
                            icon={UserIcon}
                            label="Profile & KYC"
                            active={isPathActive('/profile')}
                            onClick={() => navigate('/profile')}
                        />
                    </NavSection>

                    <NavSection title="Properties" divider={true}>
                        <NavItem
                            icon={Building}
                            label="My Properties"
                            active={isPathActive('/my-properties')}
                            onClick={() => navigate('/my-properties')}
                        />
                        <NavItem
                            icon={PlusCircle}
                            label="Register Property"
                            active={isPathActive('/register-property')}
                            onClick={() => navigate('/register-property')}
                        />
                        <NavItem
                            icon={Search}
                            label="Search Assets"
                            active={isPathActive('/search-property')}
                            onClick={() => navigate('/search-property')}
                        />
                    </NavSection>

                    <NavSection title="Transactions" divider={true}>
                        <NavItem
                            icon={Activity}
                            label="My Transactions"
                            active={isPathActive('/transactions')}
                            onClick={() => navigate('/transactions')}
                        />
                        <NavItem
                            icon={ArrowUpRight}
                            label="Sale"
                            active={isPathActive('/sale')}
                            onClick={() => navigate('/sale')}
                        />
                    </NavSection>

                    <NavSection title="System" divider={user?.role === 'AUTHORITY'}>
                        <NavItem
                            icon={Bell}
                            label="Notifications"
                            active={isPathActive('/notifications')}
                            onClick={() => navigate('/notifications')}
                            badge={0}
                        />
                        <NavItem
                            icon={Key}
                            label="Wallet Recovery"
                            active={isPathActive('/wallet-recovery')}
                            onClick={() => navigate('/wallet-recovery')}
                        />
                    </NavSection>

                    {user?.role === 'AUTHORITY' && (
                        <NavSection title="Authority Actions" divider={false}>
                            <NavItem
                                icon={Shield}
                                label="Command Center"
                                active={isPathActive('/authority')}
                                onClick={() => navigate('/authority')}
                            />
                            <NavItem
                                icon={FileText}
                                label="KYC Approvals"
                                active={isPathStartsWith('/authority/kyc')}
                                onClick={() => navigate('/authority/kyc/latest')}
                            />
                        </NavSection>
                    )}
                </div>

                {/* Footer */}
                <div className="user-footer">
                    {user?.role === 'AUTHORITY' && !isCollapsed && (
                        <button onClick={() => navigate('/authority')} className="user-switch-btn">
                            <Shield size={14} />
                            Switch to Authority
                        </button>
                    )}

                    <div className={`user-user-row ${isCollapsed ? 'compact' : ''}`}>
                        {!isCollapsed && (
                            <div className="user-user-info">
                                <div className="user-user-avatar">
                                    <div className="user-user-avatar-inner">
                                        {user?.name?.charAt(0) || 'U'}
                                    </div>
                                </div>
                                <div className="user-user-meta">
                                    <div className="user-user-name">{user?.name || 'User'}</div>
                                    <span className="user-user-role">{user?.role?.toUpperCase() || 'USER'}</span>
                                </div>
                            </div>
                        )}
                        <button onClick={handleLogout} className="user-logout-btn" title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className={`user-main ${isCollapsed ? 'collapsed-main' : 'expanded'}`}>
                <div style={{ height: '100%' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Sidebar;
