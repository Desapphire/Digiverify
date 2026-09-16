import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import {
    Search, MapPin, Building, ArrowRight, Loader2, Globe,
    Shield, ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle,
    Layers, Compass, ExternalLink, Filter
} from 'lucide-react';
import './PropertyPages.css';

const QUICK_FILTERS = [
    { label: 'All Records', value: '' },
    { label: 'Bengaluru Urban', value: 'Bengaluru Urban' },
    { label: 'Mumbai', value: 'Mumbai' },
    { label: 'Pune', value: 'Pune' },
    { label: 'Delhi', value: 'Delhi' },
    { label: 'Hyderabad', value: 'Hyderabad' },
];

const SearchProperty = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

    const handleSearch = async (e, customQuery) => {
        if (e) e.preventDefault();
        const searchQuery = customQuery !== undefined ? customQuery : query;
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const response = await propertyService.searchProperties(searchQuery);
            const data = response.data.data.properties || response.data.data || [];
            setResults(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Search failed:", error);
            setResults([]);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    };

    const handleQuickFilter = (val) => {
        setQuery(val);
        if (val) {
            handleSearch(null, val);
        }
    };

    const getStatusConfig = (status) => {
        const s = status?.toLowerCase() || 'pending';
        switch (s) {
            case 'active':
            case 'verified':
            case 'approved':
                return {
                    color: '#059669',
                    bg: '#ECFDF5',
                    border: '#A7F3D0',
                    label: 'Verified',
                    icon: ShieldCheck
                };
            case 'pending':
                return {
                    color: '#D97706',
                    bg: '#FFFBEB',
                    border: '#FDE68A',
                    label: 'Under Review',
                    icon: AlertTriangle
                };
            case 'rejected':
                return {
                    color: '#DC2626',
                    bg: '#FEF2F2',
                    border: '#FECACA',
                    label: 'Rejected',
                    icon: ShieldAlert
                };
            case 'frozen':
                return {
                    color: '#2563EB',
                    bg: '#EFF6FF',
                    border: '#BFDBFE',
                    label: 'Frozen by Court',
                    icon: ShieldAlert
                };
            case 'under_dispute':
                return {
                    color: '#DC2626',
                    bg: '#FEF2F2',
                    border: '#FECACA',
                    label: 'Under Dispute',
                    icon: ShieldAlert
                };
            default:
                return {
                    color: '#64748B',
                    bg: '#F1F5F9',
                    border: '#E2E8F0',
                    label: status || 'Unknown',
                    icon: Shield
                };
        }
    };

    const filteredResults = results.filter(prop => {
        if (selectedStatusFilter === 'ALL') return true;
        const status = (prop.verificationStatus || prop.status || '').toLowerCase();
        if (selectedStatusFilter === 'VERIFIED') return status === 'active' || status === 'verified' || status === 'approved';
        if (selectedStatusFilter === 'PENDING') return status === 'pending';
        if (selectedStatusFilter === 'DISPUTED') return status === 'under_dispute' || status === 'frozen' || prop.encumbranceStatus;
        return true;
    });

    return (
        <div className="property-container container-lg">
            {/* Page Header */}
            <div className="page-header-row">
                <div>
                    <h1 className="page-title">Search Land Records</h1>
                    <p className="page-subtitle">
                        Look up any registered property by survey number, district, or owner.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="gov-badge" style={{ '--badge-bg': '#EFF6FF', '--badge-color': '#1E40AF', '--badge-border': '#BFDBFE' }}>
                        <Globe size={14} /> Official Public Registry
                    </span>
                </div>
            </div>

            {/* Search HUD / Bar */}
            <div className="gov-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by survey number, district, state, or property code..."
                            className="gov-input"
                            style={{ paddingLeft: '2.8rem', fontSize: '1rem', height: '50px' }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="gov-btn gov-btn-primary"
                        style={{ height: '50px', padding: '0 2rem', fontSize: '0.95rem' }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={18} /> Search Records</>}
                    </button>
                </form>

                {/* Quick Sector Tags */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Popular Districts:
                    </span>
                    {QUICK_FILTERS.map((f, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleQuickFilter(f.value)}
                            style={{
                                background: query === f.value ? '#EFF6FF' : '#FFFFFF',
                                border: `1px solid ${query === f.value ? '#1E40AF' : '#E2E8F0'}`,
                                color: query === f.value ? '#1E40AF' : '#475569',
                                borderRadius: '6px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Filter & Counters */}
            {searched && !loading && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                            Search Results
                        </h3>
                        <span className="gov-badge" style={{ '--badge-bg': '#F1F5F9', '--badge-color': '#334155' }}>
                            {filteredResults.length} Result{filteredResults.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[
                            { id: 'ALL', label: 'All Properties' },
                            { id: 'VERIFIED', label: 'Verified' },
                            { id: 'PENDING', label: 'Under Review' },
                            { id: 'DISPUTED', label: 'Disputed / Frozen' }
                        ].map(({ id, label }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setSelectedStatusFilter(id)}
                                className={`cyber-filter-btn ${selectedStatusFilter === id ? 'active' : ''}`}
                                style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading Indicator */}
            {loading && (
                <div style={{ padding: '5rem 0', textAlign: 'center' }}>
                    <Loader2 size={36} className="animate-spin" style={{ color: '#1E40AF', margin: '0 auto 1rem' }} />
                    <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>Searching property records...</p>
                </div>
            )}

            {/* Results Grid */}
            {!loading && searched && (
                <div>
                    {filteredResults.length > 0 ? (
                        <div className="gov-parcel-grid">
                            {filteredResults.map((prop) => {
                                const sc = getStatusConfig(prop.verificationStatus || prop.status);
                                const StatusIcon = sc.icon;
                                const propId = prop._id || prop.id;
                                const surveyNum = prop.surveyNumber || prop.details?.surveyNumber || 'Survey Number Not Listed';
                                const district = prop.district || prop.details?.district || 'General Area';
                                const state = prop.state || prop.details?.state || '';
                                const area = prop.areaSqft || prop.details?.area;
                                const tokenId = prop.nftTokenId || prop.details?.nftTokenId;

                                return (
                                    <div
                                        key={propId}
                                        className="gov-parcel-card"
                                        style={{ '--tier-color': sc.color }}
                                        onClick={() => navigate(`/properties/${propId}`)}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Survey Number
                                                    </span>
                                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0.2rem 0 0' }}>
                                                        {surveyNum}
                                                    </h3>
                                                </div>
                                                <div className="gov-badge" style={{ '--badge-color': sc.color, '--badge-bg': sc.bg, '--badge-border': sc.border }}>
                                                    <StatusIcon size={12} />
                                                    {sc.label}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                                                <MapPin size={14} style={{ color: '#1E40AF', flexShrink: 0 }} />
                                                <span>{district}{state ? `, ${state}` : ''}</span>
                                            </div>

                                            <div className="gov-data-grid" style={{ margin: '0 0 1rem', padding: '0.85rem 1rem' }}>
                                                <div className="gov-data-item">
                                                    <span className="label">Total Area</span>
                                                    <span className="value">{area ? `${area.toLocaleString()} sq.ft` : 'Unspecified'}</span>
                                                </div>
                                                <div className="gov-data-item">
                                                    <span className="label">Title Status</span>
                                                    <span className="value" style={{ color: !prop.encumbranceStatus ? '#059669' : '#DC2626' }}>
                                                        {!prop.encumbranceStatus ? 'Clear Title' : 'Has Legal Issues'}
                                                    </span>
                                                </div>
                                            </div>

                                            {tokenId && (
                                                <div style={{ marginBottom: '0.5rem' }}>
                                                    <span className="gov-badge" style={{ '--badge-bg': '#F5F3FF', '--badge-color': '#7C3AED', '--badge-border': '#DDD6FE', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}>
                                                        Digital Certificate #{tokenId}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1E40AF', fontSize: '0.85rem', fontWeight: 700 }}>
                                                View Property Details <ArrowRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <Globe size={44} style={{ color: '#94A3B8', margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>No Properties Found</h3>
                            <p style={{ color: '#64748B', maxWidth: '420px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                No matching properties found for query <strong style={{ color: '#0F172A' }}>"{query}"</strong>. Try checking your survey number format or searching by district.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchProperty;
