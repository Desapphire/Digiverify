import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import {
    Building, MapPin, CheckCircle2, Shield, AlertTriangle, ShieldAlert,
    Lock, Eye, ArrowUpRight, PlusCircle, Search, Loader2, ExternalLink
} from 'lucide-react';
import './PropertyPages.css';

const MyProperties = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

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
        active: { label: 'ACTIVE', color: 'hsl(142,71%,45%)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', icon: CheckCircle2, badgeClass: 'badge-success' },
        verified: { label: 'ACTIVE', color: 'hsl(142,71%,45%)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', icon: CheckCircle2, badgeClass: 'badge-success' },
        pending: { label: 'PENDING', color: 'hsl(38,92%,50%)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', icon: AlertTriangle, badgeClass: 'badge-warning-glow' },
        frozen: { label: 'FROZEN', color: 'hsl(200,85%,55%)', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', icon: Lock, badgeClass: 'badge-neutral' },
        under_dispute: { label: 'UNDER DISPUTE', color: 'hsl(348,83%,47%)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', icon: AlertTriangle, badgeClass: 'badge-danger' },
        pending_transfer: { label: 'TRANSFERRING', color: 'hsl(280,80%,60%)', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', icon: ArrowUpRight, badgeClass: 'badge-warning' },
        rejected: { label: 'REJECTED', color: 'hsl(348,83%,47%)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', icon: ShieldAlert, badgeClass: 'badge-danger' },
    };

    const getStatusConfig = (status) => statusConfig[status] || statusConfig.pending;

    // Filter and search
    const filtered = properties.filter(p => {
        if (filter !== 'all' && p.status !== filter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (p.surveyNumber?.toLowerCase().includes(q) ||
                p.district?.toLowerCase().includes(q) ||
                p.state?.toLowerCase().includes(q) ||
                p.addressLine?.toLowerCase().includes(q));
        }
        return true;
    });

    const statusCounts = {
        all: properties.length,
        active: properties.filter(p => p.status === 'active' || p.status === 'verified').length,
        pending: properties.filter(p => p.status === 'pending').length,
        frozen: properties.filter(p => p.status === 'frozen').length,
        under_dispute: properties.filter(p => p.status === 'under_dispute').length,
        rejected: properties.filter(p => p.status === 'rejected').length,
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: 'hsl(255,85%,65%)' }} className="animate-spin" />
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Properties...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                        My <span className="text-gradient">Properties</span>
                    </h1>
                    <p className="text-muted font-medium">
                        {properties.length} registered asset{properties.length !== 1 ? 's' : ''} on the blockchain
                    </p>
                </div>
                <button
                    className="btn btn-primary btn-glow w-full md:w-auto"
                    onClick={() => navigate('/register-property')}
                    style={{ fontSize: '0.9rem', padding: '0.75rem 1.5rem' }}
                >
                    <PlusCircle size={18} /> Register New Asset
                </button>
            </div>

            {/* Search + Filter Bar */}
            <div className="flex flex-col xl:flex-row gap-4 mb-8">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(220,15%,60%)' }} />
                    <input
                        className="input-premium w-full"
                        type="text"
                        placeholder="Search by survey number, location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '2.75rem' }}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(statusCounts).map(([key, count]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            style={{
                                padding: '0.5rem 0.9rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                border: `1px solid ${filter === key ? 'rgba(139,92,246,0.4)' : 'var(--border-subtle)'}`,
                                background: filter === key ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.15)',
                                color: filter === key ? 'hsl(255,85%,65%)' : 'hsl(220,15%,60%)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {key === 'all' ? 'All' : key.replace('_', ' ')} ({count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Property Grid */}
            {filtered.length === 0 ? (
                <div className="empty-state max-w-2xl mx-auto mt-12">
                    <Building size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'hsl(255,85%,65%)', display: 'inline-block' }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {properties.length === 0 ? 'No properties registered yet' : 'No properties match your filters'}
                    </p>
                    <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
                        {properties.length === 0 ? 'Register your first property to get started on the blockchain.' : 'Try adjusting your search or filter criteria.'}
                    </p>
                    {properties.length === 0 && (
                        <button className="btn btn-primary" onClick={() => navigate('/register-property')} style={{ fontSize: '0.875rem' }}>
                            <PlusCircle size={16} /> Register Property
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filtered.map((prop) => {
                        const sc = getStatusConfig(prop.status);
                        const StatusIcon = sc.icon;
                        return (
                            <div
                                key={prop.id}
                                className="property-card flex flex-col md:flex-row w-full justify-between items-start md:items-center gap-6"
                                style={{ borderLeftColor: sc.color }}
                                onClick={() => navigate(`/properties/${prop.id}`)}
                            >
                                <div className="w-full md:w-auto">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            {prop.surveyNumber}
                                            {(prop.status === 'active' || prop.status === 'verified') && <CheckCircle2 size={16} style={{ color: 'hsl(142,71%,45%)' }} />}
                                        </h3>
                                        <span className={`badge ${sc.badgeClass}`} style={{ fontSize: '0.6rem' }}>
                                            <StatusIcon size={10} style={{ marginRight: '0.2rem' }} /> {sc.label}
                                        </span>
                                        {prop.encumbranceStatus && prop.encumbranceStatus !== 'clear' && (
                                            <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>
                                                <Shield size={10} style={{ marginRight: '0.2rem' }} /> ENCUMBERED
                                            </span>
                                        )}
                                    </div>
                                    <div className="property-card-meta">
                                        <p className="meta-item">
                                            <MapPin size={13} /> {prop.district}{prop.state ? `, ${prop.state}` : ''}
                                        </p>
                                        {prop.areaSqft && (
                                            <p className="meta-item" style={{ fontFamily: 'monospace' }}>
                                                {prop.areaSqft.toLocaleString()} sq.ft
                                            </p>
                                        )}
                                        {prop.nftTokenId && (
                                            <a 
                                                href={`https://testnet.snowtrace.io/nft/0xE94d65289Cc088f597C077938A6D7Fc0974196fe/${prop.nftTokenId}`}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="meta-item hover-glow"
                                                style={{ color: 'hsl(255,85%,65%)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                NFT #{prop.nftTokenId} <ExternalLink size={10} />
                                            </a>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'hsl(220,15%,60%)', fontFamily: 'monospace' }}>
                                        ID: {prop.id}
                                    </p>
                                </div>

                                <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
                                    <button
                                        className="btn btn-ghost flex-1 md:flex-none justify-center"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/properties/${prop.id}`); }}
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                    >
                                        <Eye size={16} /> Details
                                    </button>
                                    {(prop.status === 'active' || prop.status === 'verified') && (
                                        <button
                                            className="btn btn-primary flex-1 md:flex-none justify-center"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/properties/${prop.id}`); }}
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                        >
                                            <ArrowUpRight size={16} /> Sell
                                        </button>
                                    )}
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
