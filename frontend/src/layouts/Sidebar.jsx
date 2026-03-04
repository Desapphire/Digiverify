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
    ChevronRight,
    Search,
    ChevronLeft,
    Menu,
    Shield,
    FileText
} from 'lucide-react';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Helper to check if a specific tab is active in the dashboard
    const isDashboardTabActive = (tabName) => {
        if (location.pathname !== '/dashboard') return false;
        const searchParams = new URLSearchParams(location.search);
        const currentTab = searchParams.get('tab') || 'overview';
        return currentTab === tabName;
    };

    // Helper to check exact path match
    const isPathActive = (path) => location.pathname === path;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
        <button
            onClick={onClick}
            title={isCollapsed ? label : ''}
            className={`w-full flex items-center justify-between px-3 py-2.5 mb-1 group sidebar-nav-item ${active
                ? 'sidebar-nav-active text-white'
                : 'text-muted hover:text-white'
                }`}
        >
            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
                <Icon size={18} className={`${active ? 'text-white' : 'text-muted group-hover:text-white'} transition-colors`} />
                {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
            </div>
            {!isCollapsed && (
                <div className="flex items-center gap-2">
                    {badge > 0 && (
                        <span className="bg-primary-base text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
            )}
        </button>
    );

    const NavSection = ({ title, children, showDivider = true }) => (
        <div className={`mb-4 ${showDivider ? 'pb-4 border-b border-white/5' : ''}`}>
            {!isCollapsed && title && (
                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest px-3 mb-2">{title}</h3>
            )}
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    );

    return (
        <div className="flex bg-bg-base min-h-screen">
            {/* Sidebar */}
            <aside className={`fixed left-0 top-0 h-screen sidebar-panel flex flex-col z-50 ${isCollapsed ? 'w-20' : 'w-72'}`}>
                {/* Logo Area */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 relative">
                    <div className={`flex items-center gap-3 overflow-hidden transition-all ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-base to-secondary-base flex items-center justify-center shadow-glow-primary shrink-0">
                            <Building size={16} className="text-white" />
                        </div>
                        <span className="font-display font-bold text-lg tracking-tight text-white whitespace-nowrap">
                            Digi<span className="text-primary-glow">verify</span>
                        </span>
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
                    >
                        {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto hide-scrollbar py-4 px-3">
                    <NavSection showDivider={true}>
                        <NavItem
                            icon={Home}
                            label="Dashboard"
                            active={location.pathname === '/dashboard' && !location.search}
                            onClick={() => navigate('/dashboard')}
                        />
                    </NavSection>

                    <NavSection title="Identity" showDivider={true}>
                        <NavItem
                            icon={UserIcon}
                            label="Profile & KYC"
                            active={isPathActive('/profile')}
                            onClick={() => navigate('/profile')}
                        />
                    </NavSection>

                    <NavSection title="Properties" showDivider={true}>
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
                            onClick={() => { }}
                        />
                    </NavSection>

                    <NavSection title="Transactions" showDivider={true}>
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

                    <NavSection title="System" showDivider={false}>
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

                    {/* Authority NavSection conditionally rendered */}
                    {user?.role === 'AUTHORITY' && (
                        <NavSection title="Authority Actions" showDivider={false}>
                            <NavItem
                                icon={Shield}
                                label="Command Center"
                                active={isPathActive('/authority')}
                                onClick={() => navigate('/authority')}
                            />
                            <NavItem
                                icon={FileText}
                                label="KYC Approvals"
                                active={location.pathname.startsWith('/authority/kyc')}
                                onClick={() => navigate('/authority/kyc/latest')}
                            />
                        </NavSection>
                    )}
                </div>

                {/* User Profile Footer */}
                <div className="p-3 border-t border-white/5 bg-black/10">
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                        {!isCollapsed && (
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shrink-0">
                                    <div className="w-full h-full bg-bg-base text-white rounded-full flex items-center justify-center font-bold text-sm">
                                        {user?.name?.charAt(0) || 'U'}
                                    </div>
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-white truncate">{user?.name || 'User'}</p>
                                    <p className="text-[10px] text-muted font-mono truncate bg-white/5 px-1.5 py-0.5 rounded-md inline-block mt-0.5">{user?.role?.toUpperCase() || 'USER'}</p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="p-2 text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors relative group"
                            title="Logout"
                        >
                            <LogOut size={18} />
                            {isCollapsed && (
                                <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                                    Logout
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 min-h-screen relative transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-72'}`}>
                {/* Background Blobs (moved here so they stay behind content but don't bleed under sidebar as much) */}
                <div className="background-blobs pointer-events-none absolute inset-0 overflow-hidden -z-10">
                    <div className="blob blob-1 top-0 left-0 w-96 h-96 opacity-20"></div>
                    <div className="blob blob-2 bottom-0 right-0 w-[500px] h-[500px] opacity-10"></div>
                </div>

                <div className="h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Sidebar;
