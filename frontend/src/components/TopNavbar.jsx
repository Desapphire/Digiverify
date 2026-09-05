import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useNavigate } from 'react-router-dom';
import { AvalancheIcon } from './Icons';
import { DigiVerifyLogo } from './DigiVerifyLogo';
import { Bell, ChevronDown, User, ExternalLink, LogOut, Wallet, CheckCircle2 } from 'lucide-react';

export const TopNavbar = ({ 
    title = "", 
    subtitle = "", 
    showLogo = false, 
    logoSubtitle = "Verified Land Registry",
    showNotifications = true,
    showProfile = true,
    showNetwork = true,
    customRight = null
}) => {
    const { user, logout } = useAuth();
    const { account, connectWallet, isConnecting } = useWeb3();
    const navigate = useNavigate();
    const [walletMenuOpen, setWalletMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const activeAddress = account || user?.walletAddress || null;
    const shortenAddr = (addr) => {
        if (!addr) return 'Connect Wallet';
        if (addr.length < 12) return addr;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <header 
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 2rem',
                borderBottom: '1px solid #1E293B',
                background: '#0B0F19',
                position: 'sticky',
                top: 0,
                zIndex: 40,
                width: '100%'
            }}
        >
            {/* Left: Title or Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                {showLogo ? (
                    <DigiVerifyLogo size={32} subtitle={logoSubtitle} />
                ) : (
                    <div>
                        {title && (
                            <h1 style={{ 
                                fontSize: '1.4rem', 
                                fontWeight: 700, 
                                color: '#F8FAFC',
                                letterSpacing: '-0.02em',
                                margin: 0
                            }}>
                                {title}
                            </h1>
                        )}
                        {subtitle && (
                            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '1px', margin: 0 }}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Network Badge, Wallet, Notifications, Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {customRight}

                {/* Network & Wallet Pill Badge */}
                {showNetwork && (
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => {
                                if (!account && connectWallet) {
                                    connectWallet();
                                } else {
                                    setWalletMenuOpen(!walletMenuOpen);
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.4rem 0.85rem',
                                background: '#0F172A',
                                border: '1px solid #1E293B',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s ease',
                                outline: 'none'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#334155'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#1E293B'}
                        >
                            <AvalancheIcon size={18} />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F8FAFC', fontFamily: 'JetBrains Mono' }}>
                                    {shortenAddr(activeAddress)}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 500 }}>
                                    Avalanche Fuji
                                </span>
                            </div>
                            <ChevronDown size={13} style={{ color: '#94A3B8', marginLeft: '2px' }} />
                        </button>

                        {/* Wallet Dropdown */}
                        {walletMenuOpen && (
                            <div 
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 6px)',
                                    background: '#0F172A',
                                    border: '1px solid #334155',
                                    borderRadius: '10px',
                                    padding: '0.75rem',
                                    width: '260px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                    zIndex: 100
                                }}
                            >
                                <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid #1E293B', marginBottom: '0.5rem' }}>
                                    <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.04em' }}>Network Connected</p>
                                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38BDF8', marginTop: '2px' }}>Avalanche Fuji Testnet (43113)</p>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#E2E8F0', wordBreak: 'break-all', fontFamily: 'JetBrains Mono', padding: '0.35rem 0' }}>
                                    {account || activeAddress}
                                </div>
                                <a 
                                    href={`https://testnet.snowtrace.io/address/${account || activeAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        fontSize: '0.75rem',
                                        color: '#38BDF8',
                                        textDecoration: 'none',
                                        marginTop: '0.4rem',
                                        padding: '0.3rem 0'
                                    }}
                                >
                                    <ExternalLink size={12} /> View on Snowtrace Explorer
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Notifications Bell */}
                {showNotifications && (
                    <button
                        onClick={() => navigate('/notifications')}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: '#0F172A',
                            border: '1px solid #1E293B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC'; e.currentTarget.style.borderColor = '#334155'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#1E293B'; }}
                        title="Notifications"
                    >
                        <Bell size={16} />
                        {/* Red Dot */}
                        <span 
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#EF4444'
                            }}
                        />
                    </button>
                )}

                {/* Profile Circle */}
                {showProfile && (
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: '#1E293B',
                                border: '1px solid #334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#F8FAFC',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s ease',
                                outline: 'none'
                            }}
                            title={user?.name || "Account"}
                        >
                            {user?.name?.charAt(0) || <User size={16} />}
                        </button>

                        {profileMenuOpen && (
                            <div 
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 6px)',
                                    background: '#0F172A',
                                    border: '1px solid #334155',
                                    borderRadius: '10px',
                                    padding: '0.75rem',
                                    width: '200px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                    zIndex: 100
                                }}
                            >
                                <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid #1E293B', marginBottom: '0.5rem' }}>
                                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F8FAFC' }}>{user?.name || 'Authorized User'}</p>
                                    <p style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{user?.email || user?.role || 'Citizen'}</p>
                                </div>
                                <button 
                                    onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }}
                                    style={{ width: '100%', textAlign: 'left', padding: '0.4rem 0.5rem', background: 'none', border: 'none', color: '#E2E8F0', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '6px' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#1E293B'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                    My Profile & KYC
                                </button>
                                <button 
                                    onClick={() => { setProfileMenuOpen(false); logout(); navigate('/login'); }}
                                    style={{ width: '100%', textAlign: 'left', padding: '0.4rem 0.5rem', background: 'none', border: 'none', color: '#EF4444', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '4px' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default TopNavbar;
