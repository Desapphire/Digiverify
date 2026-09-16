import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    Search, Loader2, Wallet, Building2, Activity,
    ShieldCheck, User, Mail, Clock, Hash,
    ArrowRight, MapPin, Ruler, ScrollText, AlertCircle,
    Copy, CheckCircle2, Phone, Shield, FileText, ExternalLink,
    Fingerprint, Sparkles, UserCheck, AlertTriangle, Printer,
    RefreshCcw, ChevronRight, Eye, Calendar, Award, Check
} from 'lucide-react';

const WalletSearch = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);
    const [copiedId, setCopiedId] = useState('');
    const [activeTab, setActiveTab] = useState('profile'); // profile, properties, sales, logs

    // Citizen Directory quick listing
    const [directoryUsers, setDirectoryUsers] = useState([]);
    const [loadingDirectory, setLoadingDirectory] = useState(false);

    useEffect(() => {
        loadDirectory();
    }, []);

    const loadDirectory = async () => {
        setLoadingDirectory(true);
        try {
            const res = await adminService.listUsers();
            const users = res.data?.data || [];
            setDirectoryUsers(users);
        } catch (err) {
            console.error('Failed to load citizen directory', err);
        } finally {
            setLoadingDirectory(false);
        }
    };

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 2000);
    };

    const handleSearch = async (e, directQuery = null) => {
        if (e) e.preventDefault();
        const term = (directQuery !== null ? directQuery : query).trim();
        if (!term) return;

        setQuery(term);
        setLoading(true);
        setError('');
        setResult(null);
        setSearched(true);
        setActiveTab('profile');

        try {
            const res = await adminService.lookupWallet(term);
            setResult(res.data?.data || null);
        } catch (err) {
            setError(err.response?.data?.message || 'No records found for this citizen, account, or phone number.');
        } finally {
            setLoading(false);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'verified':
            case 'active':
                return { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', label: 'Verified' };
            case 'rejected':
            case 'frozen':
            case 'cancelled':
                return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: (status || 'Rejected').toUpperCase() };
            case 'completed':
                return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: 'Completed' };
            default:
                return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', label: (status || 'Pending').toUpperCase() };
        }
    };

    // Calculate valuation summary
    const totalLandValue = (result?.properties || []).reduce((sum, p) => {
        return sum + (Number(p.circleRateValuation || p.estimatedFairPrice || 0));
    }, 0);

    return (
        <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem',
                backgroundColor: '#FFFFFF',
                padding: '1.5rem 1.75rem',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                        }}>
                            <ShieldCheck size={12} />
                            Citizen Directory
                        </span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#047857',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px'
                        }}>
                            Ethereum Sepolia Testnet
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Find Citizen & Property Records
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Search and verify citizen profiles, national ID records, owned title deeds, and transaction history.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => window.print()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            color: '#334155',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                    >
                        <Printer size={14} /> Print Dossier
                    </button>
                    <button
                        onClick={() => navigate('/authority')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            color: '#334155',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                    >
                        ← Dashboard
                    </button>
                </div>
            </div>

            {/* Omni Search Console & Directory Carousel */}
            <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
            }}>
                {/* Search Bar Form */}
                <form onSubmit={(e) => handleSearch(e)} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flex: '1 1 320px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        boxSizing: 'border-box'
                    }}>
                        <Search size={18} style={{ color: '#64748B', flexShrink: 0 }} />
                        <input
                            type="text"
                            placeholder="Search by Web3 Wallet (0x...), Legal Name, Phone (+91...), Email, or Citizen ID..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                padding: 0,
                                margin: 0,
                                fontSize: '0.9rem',
                                color: '#0F172A',
                                boxShadow: 'none'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: 'none',
                            cursor: (loading || !query.trim()) ? 'not-allowed' : 'pointer',
                            opacity: (loading || !query.trim()) ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Inspect Citizen
                    </button>
                </form>

                {/* Directory Quick Selection */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Registered Citizens in Registry ({directoryUsers.length})
                        </span>
                        <button
                            onClick={loadDirectory}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'none',
                                border: 'none',
                                color: '#2563EB',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <RefreshCcw size={11} className={loadingDirectory ? 'animate-spin' : ''} /> Refresh List
                        </button>
                    </div>

                    {directoryUsers.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>
                            No citizens registered yet. Register a citizen or enter a wallet address above.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                            {directoryUsers.slice(0, 10).map((u) => {
                                const isSelected = result?.user?.id === u.id;
                                return (
                                    <button
                                        key={u.id}
                                        onClick={() => handleSearch(null, u.email || u.walletAddress || u.name)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: isSelected ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                                            backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                                            color: isSelected ? '#1D4ED8' : '#334155',
                                            fontSize: '0.8rem',
                                            fontWeight: isSelected ? 700 : 500,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            backgroundColor: isSelected ? '#3B82F6' : '#E2E8F0',
                                            color: isSelected ? '#FFFFFF' : '#475569',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.7rem',
                                            fontWeight: 700
                                        }}>
                                            {u.name?.charAt(0)?.toUpperCase() || 'C'}
                                        </div>
                                        <span>{u.name || shortenWallet(u.walletAddress)}</span>
                                        {u.kycStatus === 'verified' && (
                                            <CheckCircle2 size={12} color="#059669" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                    fontWeight: 600
                }}>
                    <AlertCircle size={18} color="#DC2626" />
                    <span>{error}</span>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '3.5rem 2rem',
                    textAlign: 'center'
                }}>
                    <Loader2 size={36} className="animate-spin" style={{ color: '#2563EB', margin: '0 auto 12px auto' }} />
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                        Retrieving Dossier & Smart Contract Records...
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                        Querying CitizenIdentityRegistry, LandRegistry, and Sale escrow states on Ethereum Sepolia
                    </p>
                </div>
            )}

            {/* Empty State */}
            {searched && !loading && !error && !result?.user && (!result?.properties || result.properties.length === 0) && (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '3.5rem 2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                        color: '#94A3B8'
                    }}>
                        <User size={26} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>No Records Found</h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                        No citizen profile, property titles, or sale orders matched <strong style={{ color: '#0F172A' }}>{query}</strong>.
                    </p>
                </div>
            )}

            {/* Full Citizen Dossier Display */}
            {result && (result.user || (result.properties && result.properties.length > 0)) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Top Identity Hero Card */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        padding: '1.5rem 1.75rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '1.25rem',
                            paddingBottom: '1.25rem',
                            borderBottom: '1px solid #F1F5F9'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '12px',
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.6rem',
                                    fontWeight: 800,
                                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                                }}>
                                    {result.user?.name?.charAt(0)?.toUpperCase() || 'C'}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                            {result.user?.name || 'Unregistered Citizen / Wallet Holder'}
                                        </h2>
                                        {(() => {
                                            const badge = getStatusStyle(result.user?.kycStatus || 'pending');
                                            return (
                                                <span style={{
                                                    backgroundColor: badge.bg,
                                                    border: `1px solid ${badge.border}`,
                                                    color: badge.text,
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '9999px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {badge.label}
                                                </span>
                                            );
                                        })()}
                                        <span style={{
                                            backgroundColor: '#F1F5F9',
                                            border: '1px solid #E2E8F0',
                                            color: '#475569',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            textTransform: 'uppercase'
                                        }}>
                                            {result.user?.role || 'CITIZEN'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.82rem', color: '#64748B', flexWrap: 'wrap' }}>
                                        {result.user?.email && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#334155' }}>
                                                <Mail size={13} color="#94A3B8" /> {result.user.email}
                                            </span>
                                        )}
                                        {result.user?.phone && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#334155' }}>
                                                <Phone size={13} color="#94A3B8" /> {result.user.phone}
                                            </span>
                                        )}
                                        {result.user?.city && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
                                                <MapPin size={13} color="#94A3B8" /> {result.user.city}, {result.user.state}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Wallet Quick Box */}
                            <div style={{
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>
                                        Linked Web3 Wallet
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                                        {result.user?.walletAddress ? shortenWallet(result.user.walletAddress) : 'No Wallet Bound'}
                                    </span>
                                </div>
                                {result.user?.walletAddress && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <button
                                            onClick={() => handleCopy(result.user.walletAddress, 'hero-wallet')}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '6px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #CBD5E1',
                                                cursor: 'pointer',
                                                color: '#334155'
                                            }}
                                            title="Copy Wallet Address"
                                        >
                                            {copiedId === 'hero-wallet' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                                        </button>
                                        <a
                                            href={`https://sepolia.etherscan.io/address/${result.user.walletAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: '6px',
                                                borderRadius: '6px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #CBD5E1',
                                                color: '#334155',
                                                display: 'inline-flex',
                                                alignItems: 'center'
                                            }}
                                            title="Inspect on Ethereum Sepolia Etherscan"
                                        >
                                            <ExternalLink size={13} />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4 Summary Stat Cards */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem'
                        }}>
                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                                    <Building2 size={14} color="#2563EB" /> Owned Parcels
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
                                    {result.properties?.length || 0}
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Registered Land Titles</span>
                            </div>

                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                                    <Award size={14} color="#059669" /> Land Valuation
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>
                                    {totalLandValue > 0 ? `₹${totalLandValue.toLocaleString()}` : '—'}
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Guidance Circle Rate</span>
                            </div>

                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                                    <Activity size={14} color="#7C3AED" /> Sale Orders
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
                                    {result.sales?.length || 0}
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Conveyances / Escrows</span>
                            </div>

                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                                    <Fingerprint size={14} color="#D97706" /> Face Biometrics
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                                    {result.user?.faceVerified ? (
                                        <span style={{ color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <CheckCircle2 size={16} /> Verified
                                        </span>
                                    ) : (
                                        <span style={{ color: '#94A3B8' }}>Unverified</span>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>AWS Rekognition Live</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px', flexWrap: 'wrap' }}>
                        {[
                            { key: 'profile', label: 'Citizen Identity & KYC', icon: User },
                            { key: 'properties', label: `Land & Title Deeds (${result.properties?.length || 0})`, icon: Building2 },
                            { key: 'sales', label: `Sale & Escrows (${result.sales?.length || 0})`, icon: Activity },
                            { key: 'logs', label: `Activity History (${result.auditLogs?.length || 0})`, icon: ScrollText }
                        ].map(t => {
                            const Icon = t.icon;
                            const isActive = activeTab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 16px',
                                        borderRadius: '8px 8px 0 0',
                                        border: isActive ? '1px solid #CBD5E1' : '1px solid transparent',
                                        borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                                        backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                                        color: isActive ? '#1D4ED8' : '#64748B',
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Icon size={14} /> {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab 1: Profile & Identity */}
                    {activeTab === 'profile' && result.user && (
                        <div style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                            <div>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ShieldCheck size={16} color="#2563EB" /> Government ID & Personal Details
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                    gap: '1.25rem'
                                }}>
                                    <DetailItem label="Full Legal Name" value={result.user.name} />
                                    <DetailItem label="Email Address" value={result.user.email} />
                                    <DetailItem label="Phone Number" value={result.user.phone} />
                                    
                                    <DetailItem
                                        label="Citizen System UUID"
                                        value={result.user.id}
                                        mono
                                        copyable
                                        onCopy={() => handleCopy(result.user.id, `id-${result.user.id}`)}
                                        isCopied={copiedId === `id-${result.user.id}`}
                                    />

                                    <DetailItem
                                        label="Government ID Type"
                                        value={result.user.governmentIdType || 'Aadhaar / National ID'}
                                    />

                                    <DetailItem
                                        label="National ID Number"
                                        value={result.user.governmentId || 'Verified On File'}
                                        mono
                                        copyable={!!result.user.governmentId}
                                        onCopy={() => handleCopy(result.user.governmentId, `gid-${result.user.id}`)}
                                        isCopied={copiedId === `gid-${result.user.id}`}
                                    />

                                    {result.user.birthdate && (
                                        <DetailItem
                                            label="Date of Birth & Age"
                                            value={`${new Date(result.user.birthdate).toLocaleDateString()} (${Math.floor((new Date() - new Date(result.user.birthdate)) / (365.25 * 24 * 60 * 60 * 1000))} years)`}
                                        />
                                    )}

                                    <DetailItem
                                        label="Registration Date"
                                        value={result.user.createdAt ? new Date(result.user.createdAt).toLocaleString() : '—'}
                                    />

                                    <DetailItem
                                        label="Account Status"
                                        value={result.user.isActive ? 'Active & Authorized' : 'Suspended'}
                                    />

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <DetailItem
                                            label="Permanent Residential Address"
                                            value={[
                                                result.user.houseNumber,
                                                result.user.locality,
                                                result.user.city,
                                                result.user.pinCode ? `PIN: ${result.user.pinCode}` : '',
                                                result.user.state,
                                                result.user.country
                                            ].filter(Boolean).join(', ') || 'Address not registered'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cryptographic Attestation Block */}
                            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Sparkles size={16} color="#4F46E5" /> On-Chain Attestation & Cryptographic Commitments
                                </h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                    gap: '1rem'
                                }}>
                                    {/* ZK Identity Hash */}
                                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                                Zero-Knowledge ID Hash
                                            </span>
                                            <button
                                                onClick={() => handleCopy(result.user.governmentIdHash, 'id-hash')}
                                                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                            >
                                                {copiedId === 'id-hash' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                                            </button>
                                        </div>
                                        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#334155', backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', wordBreak: 'break-all', margin: 0 }}>
                                            {result.user.governmentIdHash || '0x0000000000000000000000000000000000000000000000000000000000000000'}
                                        </p>
                                        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                                            Anchored in CitizenIdentityRegistry.sol on Ethereum Sepolia
                                        </span>
                                    </div>

                                    {/* Biometric Match Hash */}
                                    <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Fingerprint size={13} color="#2563EB" /> Biometric Face Hash
                                            </span>
                                            {result.user.faceIdHash && (
                                                <button
                                                    onClick={() => handleCopy(result.user.faceIdHash, 'face-hash')}
                                                    style={{ background: 'none', border: 'none', color: '#1D4ED8', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                                >
                                                    {copiedId === 'face-hash' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                                                </button>
                                            )}
                                        </div>
                                        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#1E3A8A', backgroundColor: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #BFDBFE', wordBreak: 'break-all', margin: 0 }}>
                                            {result.user.faceIdHash || 'No biometric face embedding captured'}
                                        </p>
                                        <span style={{ fontSize: '0.68rem', color: '#2563EB' }}>
                                            AWS Rekognition Live Facial Liveness Anchor
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Land & Title Deeds */}
                    {activeTab === 'properties' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {(!result.properties || result.properties.length === 0) ? (
                                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '3rem 2rem', textAlign: 'center' }}>
                                    <Building2 size={32} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>No Properties Owned</h4>
                                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>This citizen currently holds no registered land titles or co-ownership shares.</p>
                                </div>
                            ) : (
                                result.properties.map((p) => (
                                    <div
                                        key={p.id}
                                        style={{
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '12px',
                                            border: '1px solid #E2E8F0',
                                            padding: '1.25rem 1.5rem',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                                                        {p.propertyCode || 'Property Title'}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                                        Survey #{p.surveyNumber || '—'}
                                                    </span>
                                                    {p.nftTokenId && (
                                                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: '#4338CA', backgroundColor: '#EEF2FF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #C7D2FE' }}>
                                                            LandNFT #{p.nftTokenId}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={13} color="#94A3B8" /> {p.locality || ''} {p.district}, {p.state}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {(() => {
                                                    const b = getStatusStyle(p.status);
                                                    return (
                                                        <span style={{ backgroundColor: b.bg, border: `1px solid ${b.border}`, color: b.text, fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                                                            {b.label}
                                                        </span>
                                                    );
                                                })()}
                                                {p.encumbranceStatus && (
                                                    <span style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                                                        LOCKED
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.82rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Land Area</span>
                                                <span style={{ fontWeight: 700, color: '#0F172A' }}>{p.areaSqft ? `${p.areaSqft} sq.ft` : '—'}</span>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Circle Rate Valuation</span>
                                                <span style={{ fontWeight: 800, color: '#047857' }}>
                                                    {p.circleRateValuation || p.estimatedFairPrice ? `₹${Number(p.circleRateValuation || p.estimatedFairPrice).toLocaleString()}` : '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>GPS Coordinates</span>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>{p.coordinates || 'GPS Location Verified'}</span>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Registered Date</span>
                                                <span style={{ color: '#475569' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</span>
                                            </div>
                                        </div>

                                        {/* Co-Owners Breakdown */}
                                        {p.coOwners && p.coOwners.length > 0 && (
                                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                                                    Co-Ownership & Share Partitioning ({p.coOwners.length} owners)
                                                </span>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px' }}>
                                                    {p.coOwners.map((co, idx) => (
                                                        <div key={idx} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    {co.name || shortenWallet(co.walletAddress)}
                                                                    {co.isPrimary && (
                                                                        <span style={{ fontSize: '0.6rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 800, padding: '1px 4px', borderRadius: '4px' }}>
                                                                            PRIMARY
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#94A3B8' }}>
                                                                    {shortenWallet(co.walletAddress)}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', backgroundColor: '#F1F5F9', padding: '3px 6px', borderRadius: '4px' }}>
                                                                {co.sharePercentage ? `${co.sharePercentage}%` : `${((co.sharePercentageBps || 0) / 100).toFixed(2)}%`}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Tab 3: Sales & Escrows */}
                    {activeTab === 'sales' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {(!result.sales || result.sales.length === 0) ? (
                                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '3rem 2rem', textAlign: 'center' }}>
                                    <Activity size={32} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>No Sale Transactions</h4>
                                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>This citizen has not participated in any property sales or escrow conveyances yet.</p>
                                </div>
                            ) : (
                                result.sales.map((s) => (
                                    <div key={s.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                                                    Sale Order #{s.id?.slice(0, 8)}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#047857', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                                                    ₹{Number(s.salePrice).toLocaleString()}
                                                </span>
                                            </div>
                                            {(() => {
                                                const b = getStatusStyle(s.status);
                                                return (
                                                    <span style={{ backgroundColor: b.bg, border: `1px solid ${b.border}`, color: b.text, fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                                                        {b.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                                            <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>Seller</span>
                                                <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 600 }}>{s.sellerWallet}</span>
                                            </div>
                                            <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', display: 'block', textTransform: 'uppercase' }}>Buyer</span>
                                                <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 600 }}>{s.buyerWallet}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Tab 4: Activity History */}
                    {activeTab === 'logs' && (
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ScrollText size={16} color="#475569" /> Cryptographic Audit Trail & User Actions
                            </h3>

                            {(!result.auditLogs || result.auditLogs.length === 0) ? (
                                <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>No activity logs recorded for this citizen.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {result.auditLogs.map((log, i) => (
                                        <div
                                            key={log.id || i}
                                            style={{
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                padding: '10px 14px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                                                    {log.action_type || log.actionType}
                                                </span>
                                                {log.entity_type && (
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', backgroundColor: '#E2E8F0', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                        {log.entity_type}
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#94A3B8' }}>
                                                {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.75rem',
                color: '#94A3B8',
                paddingTop: '1rem',
                borderTop: '1px solid #E2E8F0'
            }}>
                <ShieldCheck size={14} color="#2563EB" />
                <span>DigiVerify Land Registry — Verified Land Records & Citizen Directory</span>
            </div>
        </div>
    );
};

const DetailItem = ({ label, value, mono = false, copyable = false, onCopy, isCopied }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>{label}</span>
            {copyable && value && value !== '—' && value !== 'Not Provided' && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onCopy) onCopy();
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: 0
                    }}
                >
                    {isCopied ? <><Check size={11} color="#059669" /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
            )}
        </div>
        <p style={{
            margin: 0,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#0F172A',
            wordBreak: 'break-all',
            ...(mono ? { fontFamily: 'monospace', backgroundColor: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.78rem' } : {})
        }}>
            {value || '—'}
        </p>
    </div>
);

export default WalletSearch;
