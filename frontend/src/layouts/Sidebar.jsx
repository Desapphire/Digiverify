import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
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
    Copy,
    Check,
    Wallet,
    Globe,
    ChevronRight,
    ShieldCheck,
    ExternalLink
} from 'lucide-react';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const { account, chainId, connectWallet, isConnecting } = useWeb3();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [copied, setCopied] = useState(false);

    const isPathActive = (path) => location.pathname === path;
    const isPathStartsWith = (prefix) => location.pathname.startsWith(prefix);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleCopyAddress = (e) => {
        e.stopPropagation();
        if (account) {
            navigator.clipboard.writeText(account);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Breadcrumb Resolver
    const getBreadcrumbInfo = () => {
        const path = location.pathname;
        if (path === '/dashboard') return { category: 'Portal', title: 'Dashboard' };
        if (path === '/profile') return { category: 'Account', title: 'Profile & Verification' };
        if (path === '/my-properties') return { category: 'Properties', title: 'My Properties' };
        if (path === '/register-property') return { category: 'Properties', title: 'Add Property' };
        if (path === '/search-property') return { category: 'Registry', title: 'Search Properties' };
        if (path.startsWith('/reapply-property') || path.endsWith('/reapply')) return { category: 'Properties', title: 'Reapply Property Registration' };
        if (path.startsWith('/properties/')) return { category: 'Properties', title: 'Property Details' };
        if (path === '/transactions') return { category: 'Transactions', title: 'Transaction History' };
        if (path === '/sale') return { category: 'Sales', title: 'Sell Property' };
        if (path.includes('/review')) return { category: 'Purchases', title: 'Review Purchase' };
        if (path.includes('/fund-block')) return { category: 'Payments', title: 'Locked Payments' };
        if (path === '/notifications') return { category: 'Updates', title: 'Notifications' };
        if (path === '/wallet-recovery') return { category: 'Security', title: 'Wallet Recovery' };
        if (path === '/reapply-kyc' || path === '/kyc/reapply') return { category: 'Account', title: 'Reapply Identity Verification (KYC)' };
        return { category: 'Portal', title: 'Services' };
    };

    const breadcrumb = getBreadcrumbInfo();

    // ── Nav Item Component ──
    const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
        <button
            onClick={onClick}
            className={`user-nav-item ${active ? 'active' : ''}`}
            title={isCollapsed ? label : undefined}
        >
            <div className={`nav-content ${isCollapsed ? 'centered' : ''}`}>
                <Icon size={18} className="nav-icon" />
                {!isCollapsed && <span className="nav-label">{label}</span>}
            </div>
            {isCollapsed && <div className="user-tip">{label}</div>}
            {!isCollapsed && badge > 0 && (
                <div className="user-nav-badge">{badge}</div>
            )}
        </button>
    );

    // ── Nav Section Component ──
    const NavSection = ({ title, children, divider = true }) => (
        <div className={`user-nav-section ${divider ? 'with-divider' : ''}`}>
            {!isCollapsed && title && (
                <div className="user-section-title">{title}</div>
            )}
            {children}
        </div>
    );

    return (
        <div className="portal-shell-container">
            {/* ── Fixed Sidebar ── */}
            <aside className={`user-sidebar ${isCollapsed ? 'user-sidebar-collapsed' : 'user-sidebar-expanded'}`}>

                {/* Top Institutional Bar / Emblem */}
                <div className="user-topbar">
                    <div className={`user-logo-box ${isCollapsed ? 'collapsed' : ''}`}>
                        <div className="gov-emblem-badge">
                            <ShieldCheck size={20} className="emblem-icon" />
                        </div>
                        <div className="user-logo-text">
                            <div className="title-row">
                                <span className="title">Digi<span className="accent">Verify</span></span>
                                <span className="gov-tag">GOV</span>
                            </div>
                            <span className="subtitle">Secure Land Registry Portal</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="user-collapse-btn"
                        title={isCollapsed ? "Expand Navigation" : "Collapse Navigation"}
                        aria-label="Toggle Sidebar"
                    >
                        {isCollapsed ? <Menu size={17} /> : <ChevronLeft size={17} />}
                    </button>
                </div>

                {/* Scrollable Navigation Area */}
                <div className="user-nav-scroll">
                    <NavSection divider={true}>
                        <NavItem
                            icon={Home}
                            label="Dashboard"
                            active={location.pathname === '/dashboard' && !location.search}
                            onClick={() => navigate('/dashboard')}
                        />
                    </NavSection>

                    <NavSection title="Account & Identity" divider={true}>
                        <NavItem
                            icon={UserIcon}
                            label="Profile & Verification"
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
                            label="Add Property"
                            active={isPathActive('/register-property')}
                            onClick={() => navigate('/register-property')}
                        />
                        <NavItem
                            icon={Search}
                            label="Search Properties"
                            active={isPathActive('/search-property')}
                            onClick={() => navigate('/search-property')}
                        />
                    </NavSection>

                    <NavSection title="Transfers & Sales" divider={true}>
                        <NavItem
                            icon={Activity}
                            label="Transactions"
                            active={isPathActive('/transactions')}
                            onClick={() => navigate('/transactions')}
                        />
                        <NavItem
                            icon={ArrowUpRight}
                            label="Sell Property"
                            active={isPathActive('/sale')}
                            onClick={() => navigate('/sale')}
                        />
                    </NavSection>

                    <NavSection title="Support & Security" divider={user?.role === 'AUTHORITY'}>
                        <NavItem
                            icon={Bell}
                            label="Notifications"
                            active={isPathActive('/notifications')}
                            onClick={() => navigate('/notifications')}
                        />
                        <NavItem
                            icon={Key}
                            label="Wallet Recovery"
                            active={isPathActive('/wallet-recovery')}
                            onClick={() => navigate('/wallet-recovery')}
                        />
                    </NavSection>

                    {user?.role === 'AUTHORITY' && (
                        <NavSection title="Authority Controls" divider={false}>
                            <NavItem
                                icon={Shield}
                                label="Admin Center"
                                active={isPathActive('/authority')}
                                onClick={() => navigate('/authority')}
                            />
                            <NavItem
                                icon={FileText}
                                label="Verification Requests"
                                active={isPathStartsWith('/authority/kyc')}
                                onClick={() => navigate('/authority/kyc/latest')}
                            />
                        </NavSection>
                    )}
                </div>

                {/* Sidebar Footer: User Account Info Chip & Logout */}
                <div className="user-footer">
                    {user?.role === 'AUTHORITY' && !isCollapsed && (
                        <button onClick={() => navigate('/authority')} className="user-switch-btn">
                            <Shield size={14} />
                            <span>Switch to Authority</span>
                        </button>
                    )}

                    <div className={`user-user-row ${isCollapsed ? 'compact' : ''}`}>
                        {!isCollapsed ? (
                            <div className="user-user-info">
                                <div className="user-user-avatar">
                                    <div className="user-user-avatar-inner">
                                        {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
                                    </div>
                                </div>
                                <div className="user-user-meta">
                                    <div className="user-user-name" title={user?.name || 'Citizen'}>
                                        {user?.name || 'Citizen'}
                                    </div>
                                    <div className="user-user-role-badge">
                                        {user?.role === 'AUTHORITY' ? 'AUTHORITY' : 'CITIZEN'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="user-user-avatar" title={`${user?.name || 'Citizen'} (${user?.role || 'Citizen'})`}>
                                <div className="user-user-avatar-inner">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="user-logout-btn"
                            title="Sign Out"
                            aria-label="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Layout & Content Area ── */}
            <main className={`user-main ${isCollapsed ? 'collapsed-main' : 'expanded'}`}>

                {/* ── Top Header Bar (Singapore Gov / Stripe style) ── */}
                <header className="gov-topbar">
                    {/* Left: Breadcrumb & Title */}
                    <div className="gov-topbar-left">
                        <div className="gov-breadcrumb-trail">
                            <span className="gov-breadcrumb-root">{breadcrumb.category}</span>
                            <ChevronRight size={13} className="gov-breadcrumb-separator" />
                            <span className="gov-breadcrumb-current">{breadcrumb.title}</span>
                        </div>
                        <h2 className="gov-page-header-title">{breadcrumb.title}</h2>
                    </div>

                    {/* Right: Web3 Wallet Chip, Notification, User Chip */}
                    <div className="gov-topbar-right">
                        {/* Web3 Wallet Chip with 1-Click Copy */}
                        {account ? (
                            <div
                                className={`topbar-wallet-chip ${copied ? 'copied' : ''}`}
                                onClick={handleCopyAddress}
                                title="Click to copy wallet address"
                            >
                                <div className="wallet-chip-icon-box">
                                    <Wallet size={14} />
                                </div>
                                <span className="wallet-chip-address font-mono">
                                    {account.slice(0, 6)}...{account.slice(-4)}
                                </span>
                                <button className="wallet-chip-copy-btn" aria-label="Copy Address">
                                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                </button>
                                {copied && <span className="wallet-copied-tooltip">Copied!</span>}
                            </div>
                        ) : (
                            <button
                                onClick={connectWallet}
                                disabled={isConnecting}
                                className="topbar-connect-wallet-btn"
                            >
                                <Wallet size={14} />
                                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                            </button>
                        )}

                        {/* Quick Notifications Shortcut */}
                        <button
                            onClick={() => navigate('/notifications')}
                            className={`topbar-icon-btn ${isPathActive('/notifications') ? 'active' : ''}`}
                            title="Notifications"
                            aria-label="Notifications"
                        >
                            <Bell size={17} />
                            <span className="topbar-notif-dot"></span>
                        </button>

                        {/* User Quick Profile Chip */}
                        <button
                            onClick={() => navigate('/profile')}
                            className="topbar-user-chip"
                            title="View Profile"
                        >
                            <div className="topbar-user-avatar">
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <span className="topbar-user-name">{user?.name || 'Citizen'}</span>
                        </button>
                    </div>
                </header>

                {/* ── Page Content Container ── */}
                <div className="user-page-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Sidebar;
