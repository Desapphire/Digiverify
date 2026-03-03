import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import {
    Building, MapPin, CheckCircle2, Shield, AlertTriangle,
    Lock, Eye, ArrowUpRight, PlusCircle, Search, Loader2
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
        <div className="property-container container-lg">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <h1 className="page-title">
                        My <span className="text-gradient">Properties</span>
                    </h1>
                    <p className="page-subtitle">
                        {properties.length} registered asset{properties.length !== 1 ? 's' : ''} on the blockchain
                    </p>
                </div>
                <button
                    className="btn btn-primary btn-glow"
                    onClick={() => navigate('/register-property')}
                    style={{ fontSize: '0.9rem', padding: '0.75rem 1.5rem' }}
                >
                    <PlusCircle size={18} /> Register New Asset
                </button>
            </div>

            {/* Search + Filter Bar */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(220,15%,60%)' }} />
                    <input
                        className="input-premium"
                        type="text"
                        placeholder="Search by survey number, location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '2.75rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
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
                <div className="empty-state">
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map((prop) => {
                        const sc = getStatusConfig(prop.status);
                        const StatusIcon = sc.icon;
                        return (
                            <div
                                key={prop.id}
                                className="property-card"
                                style={{ borderLeftColor: sc.color }}
                                onClick={() => navigate(`/properties/${prop.id}`)}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                        <h3 className="property-card-title">
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
                                            <p className="meta-item" style={{ color: 'hsl(255,85%,65%)', fontFamily: 'monospace' }}>
                                                NFT #{prop.nftTokenId}
                                            </p>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'hsl(220,15%,60%)', fontFamily: 'monospace' }}>
                                        ID: {prop.id}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/properties/${prop.id}`); }}
                                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                                    >
                                        <Eye size={14} /> Details
                                    </button>
                                    {(prop.status === 'active' || prop.status === 'verified') && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/properties/${prop.id}`); }}
                                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                                        >
                                            <ArrowUpRight size={14} /> Sell
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
