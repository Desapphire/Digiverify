import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import {
    MapPin, CheckCircle2, Shield, AlertTriangle, ShieldAlert,
    Lock, Eye, ArrowUpRight, PlusCircle, Search, Loader2, ExternalLink,
    Building, FileText, ChevronRight, Filter, Layers, Check, ShieldCheck,
    RotateCcw, Copy
} from 'lucide-react';
import './PropertyPages.css';
import './Dashboard.css';

const MyProperties = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                setLoading(true);
                const res = await propertyService.getMyProperties();
                if (res.data?.data) setProperties(res.data.data);
            } catch (error) {
                console.error('Failed to load properties', error);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchProperties();
    }, [user]);

    const statusConfig = {
        active: { label: 'VERIFIED', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle2 },
        verified: { label: 'VERIFIED', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle2 },
        pending: { label: 'UNDER REVIEW', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A', icon: AlertTriangle },
        frozen: { label: 'FROZEN', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', icon: Lock },
        under_dispute: { label: 'DISPUTED', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', icon: AlertTriangle },
        pending_transfer: { label: 'BEING TRANSFERRED', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', icon: ArrowUpRight },
        rejected: { label: 'REJECTED', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', icon: ShieldAlert },
    };

    const getStatusConfig = (status) => statusConfig[status] || statusConfig.pending;

    // Filter and search — also matches propertyCode (e.g. "MA-2026-00006")
    const filtered = properties.filter(p => {
        if (filter === 'active' && !(p.status === 'active' || p.status === 'verified')) return false;
        if (filter === 'pending' && p.status !== 'pending') return false;
        if (filter === 'pending_transfer' && p.status !== 'pending_transfer') return false;
        if (filter === 'frozen_or_dispute' && !(p.status === 'frozen' || p.status === 'under_dispute')) return false;
        if (filter === 'rejected' && p.status !== 'rejected') return false;
        if (filter !== 'all' && filter !== 'active' && filter !== 'pending' && filter !== 'pending_transfer' && filter !== 'frozen_or_dispute' && filter !== 'rejected' && p.status !== filter) return false;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                p.surveyNumber?.toLowerCase().includes(q) ||
                p.propertyCode?.toLowerCase().includes(q) ||
                p.district?.toLowerCase().includes(q) ||
                p.state?.toLowerCase().includes(q) ||
                p.addressLine?.toLowerCase().includes(q) ||
                p.id?.toString().includes(q)
            );
        }
        return true;
    });

    const statusCounts = {
        all: properties.length,
        active: properties.filter(p => p.status === 'active' || p.status === 'verified').length,
        pending: properties.filter(p => p.status === 'pending').length,
        pending_transfer: properties.filter(p => p.status === 'pending_transfer').length,
        frozen_or_dispute: properties.filter(p => p.status === 'frozen' || p.status === 'under_dispute').length,
        rejected: properties.filter(p => p.status === 'rejected').length,
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 style={{ width: '2.5rem', height: '2.5rem', color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.02em', fontSize: '0.875rem', color: '#1E40AF' }}>Loading your properties...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">

            {/* ─── Page Header ─── */}
            <div className="profile-header-card">
                <div className="profile-header-main">
                    <div className="profile-avatar-box">
                        <Building size={32} />
                    </div>
                    <div>
                        <div className="profile-badge-top">
                            <ShieldCheck size={14} className="text-blue-600" />
                            <span>OFFICIAL LAND REGISTRY</span>
                        </div>
                        <h1 className="profile-title">My Registered Properties</h1>
                        <p className="profile-subtitle">
                            Properties you own that are verified and recorded. ({properties.length} Total Properties)
                        </p>
                    </div>
                </div>

                <div className="profile-header-actions">
                    <button
                        className="gov-primary-btn"
                        onClick={() => navigate('/register-property')}
                    >
                        <PlusCircle size={16} /> Register New Property
                    </button>
                </div>
            </div>

            {/* ─── Search & Filter Command Bar ─── */}
            <div className="gov-white-panel mb-6" style={{ padding: '1.25rem 1.5rem' }}>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                    {/* Search Bar */}
                    <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                        <input
                            type="text"
                            placeholder="Search by survey number, property code, district, or state..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.65rem 1rem 0.65rem 2.5rem',
                                borderRadius: '10px',
                                border: '1px solid #CBD5E1',
                                background: '#F8FAFC',
                                fontSize: '0.85rem',
                                color: '#0F172A',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            className={`gov-filter-pill ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All Properties ({statusCounts.all})
                        </button>
                        <button
                            className={`gov-filter-pill ${filter === 'active' ? 'active' : ''}`}
                            onClick={() => setFilter('active')}
                        >
                            Verified ({statusCounts.active})
                        </button>
                        <button
                            className={`gov-filter-pill ${filter === 'pending' ? 'active' : ''}`}
                            onClick={() => setFilter('pending')}
                        >
                            Under Review ({statusCounts.pending})
                        </button>
                        <button
                            className={`gov-filter-pill ${filter === 'pending_transfer' ? 'active' : ''}`}
                            onClick={() => setFilter('pending_transfer')}
                        >
                            Being Sold/Transferred ({statusCounts.pending_transfer})
                        </button>
                        <button
                            className={`gov-filter-pill ${filter === 'frozen_or_dispute' ? 'active' : ''}`}
                            onClick={() => setFilter('frozen_or_dispute')}
                        >
                            Disputed / Frozen ({statusCounts.frozen_or_dispute})
                        </button>
                        <button
                            className={`gov-filter-pill ${filter === 'rejected' ? 'active' : ''}`}
                            onClick={() => setFilter('rejected')}
                            style={{
                                borderColor: filter === 'rejected' ? '#DC2626' : undefined,
                                color: filter === 'rejected' ? '#FFFFFF' : statusCounts.rejected > 0 ? '#DC2626' : undefined,
                                backgroundColor: filter === 'rejected' ? '#DC2626' : undefined
                            }}
                        >
                            Rejected ({statusCounts.rejected})
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Property Grid ─── */}
            {filtered.length === 0 ? (
                <div className="gov-white-panel text-center" style={{ padding: '3.5rem 1.5rem', borderStyle: 'dashed' }}>
                    <Building size={42} style={{ color: '#94A3B8', margin: '0 auto 1rem auto' }} />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
                        {properties.length === 0 ? 'No Properties Added Yet' : 'No Properties Match Your Filter'}
                    </h3>
                    <p style={{ color: '#64748B', fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 1.25rem auto' }}>
                        {properties.length === 0
                            ? 'Start by registering your first property to verify and record ownership.'
                            : 'Try adjusting your search terms or switching filters to find what you are looking for.'}
                    </p>
                    {properties.length === 0 && (
                        <button className="gov-primary-btn" onClick={() => navigate('/register-property')}>
                            <PlusCircle size={16} /> Register First Property
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.35rem' }}>
                    {filtered.map((prop) => {
                        const sc = getStatusConfig(prop.status);
                        const StatusIcon = sc.icon;
                        const isClear = !prop.encumbranceStatus;

                        return (
                            <div
                                key={prop.id}
                                className="gov-white-panel"
                                style={{
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '1.25rem',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    cursor: 'pointer'
                                }}
                                onClick={() => navigate(`/properties/${prop.id}`)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.borderColor = '#CBD5E1';
                                    e.currentTarget.style.boxShadow = '0 10px 24px -6px rgba(15, 23, 42, 0.08)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.04)';
                                }}
                            >
                                <div>
                                    {/* Card Header: Survey Number & Status Pill */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', gap: '0.5rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                                                    Survey #{prop.surveyNumber}
                                                </span>
                                            </div>
                                            {prop.propertyCode && (
                                                <span style={{
                                                    display: 'inline-block',
                                                    marginTop: '0.2rem',
                                                    fontSize: '0.72rem',
                                                    fontFamily: 'JetBrains Mono, monospace',
                                                    fontWeight: 700,
                                                    color: '#1E40AF',
                                                    background: '#EFF6FF',
                                                    border: '1px solid #DBEAFE',
                                                    padding: '0.1rem 0.45rem',
                                                    borderRadius: '4px'
                                                }}>
                                                    {prop.propertyCode}
                                                </span>
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                background: sc.bg,
                                                color: sc.color,
                                                border: `1px solid ${sc.border}`,
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '6px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                letterSpacing: '0.03em'
                                            }}
                                        >
                                            <StatusIcon size={12} />
                                            {sc.label}
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748B', fontSize: '0.82rem', fontWeight: 500, marginBottom: '1.1rem' }}>
                                        <MapPin size={14} style={{ color: '#1E40AF', flexShrink: 0 }} />
                                        <span>{prop.district}{prop.state ? `, ${prop.state}` : ''}</span>
                                    </div>

                                    {/* Area and Legal Status Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
                                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>Total Area</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                                                {prop.areaSqft ? `${Number(prop.areaSqft).toLocaleString()} Sq.Ft.` : 'N/A'}
                                            </span>
                                        </div>

                                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>Legal Status</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isClear ? '#065F46' : '#991B1B' }}>
                                                {isClear ? 'Clear Title' : 'Has Legal Issues'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Digital Certificate Link */}
                                    {prop.nftTokenId && (
                                        <div style={{ marginBottom: '0.85rem' }}>
                                            <a
                                                href={`https://sepolia.etherscan.io/token/0xbCB28DC4eF6242572c0a65D1643595C582106249?a=${prop.nftTokenId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    color: '#1D4ED8',
                                                    fontFamily: 'inherit',
                                                    fontSize: '0.78rem',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    textDecoration: 'none',
                                                    background: '#EFF6FF',
                                                    padding: '0.4rem 0.75rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid #BFDBFE',
                                                    fontWeight: 700,
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Digital Certificate #{prop.nftTokenId} <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    )}

                                    {/* Status Alerts if frozen / dispute */}
                                    {prop.status === 'frozen' && (
                                        <div style={{
                                            padding: '0.6rem 0.75rem',
                                            borderRadius: '8px',
                                            background: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.45rem',
                                            marginBottom: '0.85rem'
                                        }}>
                                            <Lock size={13} style={{ color: '#1E40AF', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 600 }}>
                                                Frozen by court order &bull; Transfers temporarily blocked
                                            </span>
                                        </div>
                                    )}

                                    {prop.status === 'under_dispute' && (
                                        <div style={{
                                            padding: '0.6rem 0.75rem',
                                            borderRadius: '8px',
                                            background: '#FEF2F2',
                                            border: '1px solid #FECACA',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.45rem',
                                            marginBottom: '0.85rem'
                                        }}>
                                            <AlertTriangle size={13} style={{ color: '#991B1B', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 600 }}>
                                                Active dispute on this property
                                            </span>
                                        </div>
                                    )}

                                    {prop.status === 'rejected' && (
                                        <div style={{
                                            padding: '0.75rem 0.9rem',
                                            borderRadius: '8px',
                                            background: '#FEF2F2',
                                            border: '1px solid #FECACA',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            marginBottom: '0.85rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                                    <ShieldAlert size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                                                    <span style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 800, textTransform: 'uppercase' }}>
                                                        Registration Rejected
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/reapply-property/${prop.id}`);
                                                    }}
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        color: '#FFFFFF',
                                                        backgroundColor: '#DC2626',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '2px 8px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <RotateCcw size={11} /> Reapply Now
                                                </button>
                                            </div>
                                            <p style={{ fontSize: '0.78rem', color: '#7F1D1D', margin: 0, lineHeight: 1.4 }}>
                                                <strong>Reason:</strong> {prop.adminComments || 'Document verification failed or cadastral boundary discrepancy.'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Row */}
                                <div style={{ paddingTop: '0.85rem', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', maxWidth: '100%' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>ID:</span>
                                            <span style={{ fontSize: '0.72rem', color: '#0F172A', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                                                {prop.id}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(prop.id);
                                                    setCopied(`id-${prop.id}`);
                                                    setTimeout(() => setCopied(null), 2000);
                                                }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: copied === `id-${prop.id}` ? '#059669' : '#94A3B8' }}
                                                title="Copy full Property ID"
                                            >
                                                {copied === `id-${prop.id}` ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: (prop.status === 'rejected' || prop.status === 'active' || prop.status === 'verified') ? '1fr 1fr' : '1fr',
                                        gap: '0.65rem',
                                        width: '100%'
                                    }}>
                                        <button
                                            className="gov-cancel-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/properties/${prop.id}`);
                                            }}
                                            style={{
                                                padding: '0.55rem 0.75rem',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                width: '100%',
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <Eye size={14} /> View Details
                                        </button>

                                        {prop.status === 'rejected' && (
                                            <button
                                                className="gov-primary-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/reapply-property/${prop.id}`);
                                                }}
                                                style={{
                                                    padding: '0.55rem 0.75rem',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 700,
                                                    backgroundColor: '#2563EB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    width: '100%',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                <RotateCcw size={14} /> Reapply Application
                                            </button>
                                        )}

                                        {(prop.status === 'active' || prop.status === 'verified') && (
                                            <button
                                                className="gov-primary-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/sale?propertyId=${prop.id}`);
                                                }}
                                                style={{
                                                    padding: '0.55rem 0.75rem',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    width: '100%',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                <ArrowUpRight size={14} /> Sell / Transfer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
};

export default MyProperties;
