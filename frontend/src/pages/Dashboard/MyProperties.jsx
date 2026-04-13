import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import {
    MapPin, CheckCircle2, Shield, AlertTriangle, ShieldAlert,
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
        active: { label: 'ACTIVE', color: '#00E5FF', bg: 'rgba(0, 229, 255, 0.1)', icon: CheckCircle2 },
        verified: { label: 'VERIFIED', color: '#00E5FF', bg: 'rgba(0, 229, 255, 0.1)', icon: CheckCircle2 },
        pending: { label: 'PENDING', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', icon: AlertTriangle },
        frozen: { label: 'FROZEN', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', icon: Lock },
        under_dispute: { label: 'DISPUTED', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', icon: AlertTriangle },
        pending_transfer: { label: 'TRANSFER', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.1)', icon: ArrowUpRight },
        rejected: { label: 'REJECTED', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', icon: ShieldAlert },
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
                p.addressLine?.toLowerCase().includes(q) ||
                p.id?.toString().includes(q));
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: '#00E5FF' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.875rem', color: '#00E5FF' }}>Loading properties, please wait...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tight mb-2" style={{ letterSpacing: '-0.02em', color: 'white' }}>
                        My Properties
                    </h1>
                    <p style={{ color: 'hsl(220,15%,60%)', fontSize: '0.95rem' }}>
                        Showing {properties.length} registered properties on the blockchain
                    </p>
                </div>
                <button
                    className="cyber-btn-hollow"
                    onClick={() => navigate('/register-property')}
                    style={{ '--btn-color': '#00E5FF', padding: '0.85rem 1.5rem', width: 'auto', alignSelf: 'flex-start', textTransform: 'capitalize' }}
                >
                    <PlusCircle size={18} /> Register New Property
                </button>
            </div>

            {/* Dash Bar */}
            <div className="cyber-hud-bar">
                <div className="cyber-search-wrapper">
                    <Search className="cyber-search-icon" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Survey No, District, or State..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ fontFamily: 'inherit' }}
                    />
                </div>
                <div className="cyber-filter-container">
                    {Object.entries(statusCounts).map(([key, count]) => (
                        <button
                            key={key}
                            className={`cyber-filter-btn ${filter === key ? 'active' : ''}`}
                            onClick={() => setFilter(key)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {key === 'all' ? 'All' : key.replace('_', ' ')} ({count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Property Grid */}
            {filtered.length === 0 ? (
                <div className="empty-state max-w-2xl mx-auto mt-12" style={{ border: '1px dashed rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.02)' }}>
                    <Search size={48} style={{ opacity: 0.5, marginBottom: '1.5rem', color: '#00E5FF', display: 'inline-block' }} />
                    <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'white' }}>
                        {properties.length === 0 ? 'No Properties Registered' : 'No properties match your search'}
                    </p>
                    <p style={{ marginBottom: '1.5rem', color: 'hsl(220,15%,60%)' }}>
                        {properties.length === 0 ? 'Start by registering your first property to the system.' : 'Try adjusting your search query or clear the filters.'}
                    </p>
                    {properties.length === 0 && (
                        <button className="cyber-btn-hollow" onClick={() => navigate('/register-property')} style={{ '--btn-color': '#00E5FF', textTransform: 'capitalize' }}>
                            <PlusCircle size={16} /> Register Property
                        </button>
                    )}
                </div>
            ) : (
                <div className="cyber-grid-layout">
                    {filtered.map((prop, idx) => {
                        const sc = getStatusConfig(prop.status);
                        
                        return (
                            <div
                                key={prop.id}
                                className="cyber-property-card"
                                style={{ 
                                    '--tier-color': sc.color, 
                                    '--tier-color-hover': sc.color,
                                    '--tier-glow': sc.bg,
                                    animationDelay: `${idx * 0.05}s`
                                }}
                                onClick={() => navigate(`/properties/${prop.id}`)}
                            >
                                <div className="cyber-card-glow-orb" style={{ background: sc.color }}></div>
                                
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold tracking-tight text-white mb-1">
                                            {prop.surveyNumber}
                                        </h3>
                                        <div 
                                            className="cyber-badge" 
                                            style={{ 
                                                '--badge-color': sc.color, 
                                                '--badge-bg': sc.bg,
                                                '--badge-border': `rgba(255,255,255,0.1)`,
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            <div className="cyber-badge-dot" style={{ background: sc.color, boxShadow: `0 0 8px ${sc.color}` }}></div>
                                            {sc.label}
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(220,15%,60%)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1rem' }}>
                                        <MapPin size={14} style={{ color: sc.color }} />
                                        {prop.district}{prop.state ? `, ${prop.state}` : ''}
                                    </div>

                                    <div className="cyber-data-grid">
                                        <div className="cyber-data-item">
                                            <div className="label">Area</div>
                                            <div className="value">{prop.areaSqft ? prop.areaSqft.toLocaleString() + ' sq.ft' : 'N/A'}</div>
                                        </div>
                                        <div className="cyber-data-item">
                                            <div className="label">Encumbrance</div>
                                            <div className="value" style={{ color: prop.encumbranceStatus === 'clear' ? '#00E5FF' : '#FF007F' }}>
                                                {prop.encumbranceStatus === 'clear' ? 'Clear' : 'Flagged'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {prop.nftTokenId && (
                                        <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                                            <a 
                                                href={`https://testnet.snowtrace.io/nft/0xE94d65289Cc088f597C077938A6D7Fc0974196fe/${prop.nftTokenId}`}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ color: '#00E5FF', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', background: 'rgba(0,229,255,0.05)', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(0,229,255,0.2)' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Digital Title #{prop.nftTokenId} <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem', wordBreak: 'break-all' }}>
                                        Record ID: {prop.id}
                                    </div>
                                    
                                    <div className="cyber-actions" style={{ position: 'relative', zIndex: 10 }}>
                                        <button
                                            className="cyber-btn-hollow"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/properties/${prop.id}`); }}
                                            style={{ '--btn-color': '#9ca3af', textTransform: 'capitalize' }}
                                        >
                                            <Eye size={16} /> View Details
                                        </button>
                                        {(prop.status === 'active' || prop.status === 'verified') && (
                                            <button
                                                className="cyber-btn-hollow"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/properties/${prop.id}`); }}
                                                style={{ '--btn-color': sc.color, textTransform: 'capitalize' }}
                                            >
                                                <ArrowUpRight size={16} /> Sell Property
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
