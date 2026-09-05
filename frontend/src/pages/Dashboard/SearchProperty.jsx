import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { TopNavbar } from '../../components/TopNavbar';
import { Search, MapPin, Building, Activity, ArrowRight, Loader2, Globe, Database, ExternalLink, ShieldCheck } from 'lucide-react';
import './PropertyPages.css';

const SearchProperty = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const response = await propertyService.searchProperties(query);
            setResults(response.data?.data?.properties || response.data?.data || []);
        } catch (error) {
            console.error("Search failed:", error);
            setResults([]);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    };

    const getStatusConfig = (status) => {
        const s = status?.toLowerCase() || 'pending';
        switch (s) {
            case 'active':
            case 'verified':
            case 'approved': return { color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', label: 'Verified On-Chain' };
            case 'pending': return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: 'Pending Review' };
            case 'rejected': return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', label: 'Rejected' };
            case 'frozen': return { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', label: 'Court Freeze' };
            case 'under_dispute': return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', label: 'Disputed' };
            default: return { color: '#94A3B8', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', label: status || 'Unknown' };
        }
    };

    const handleSuggestion = (term) => {
        setQuery(term);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            <TopNavbar 
                title="Property Search" 
                subtitle="Query verified real estate titles and cadastral parcels on the distributed ledger"
                showLogo={false} 
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
                {/* Search HUD Bar */}
                <div 
                    className="digi-card p-6"
                    style={{ 
                        background: '#0F172A',
                        border: '1px solid #1E293B',
                        borderRadius: '12px',
                        marginBottom: '2rem'
                    }}
                >
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by Survey Number, Property Code, District, or State..."
                                className="input-premium"
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.75rem',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="btn-cyan-glow"
                            style={{ padding: '0.75rem 1.75rem', fontSize: '0.9rem' }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Search Ledger'}
                        </button>
                    </form>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested Searches:</span>
                        {['Bangalore', 'Verified', 'Karnataka', 'Mumbai'].map(s => (
                            <button 
                                key={s}
                                type="button" 
                                onClick={() => handleSuggestion(s)} 
                                style={{ 
                                    fontSize: '0.75rem', 
                                    color: '#38BDF8', 
                                    background: '#1E293B', 
                                    border: '1px solid #334155', 
                                    borderRadius: '6px',
                                    padding: '0.2rem 0.6rem',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div style={{ padding: '5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 size={32} className="animate-spin" style={{ color: '#0284C7', marginBottom: '1rem' }} />
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600 }}>Querying Avalanche Fuji Blockchain...</p>
                    </div>
                )}

                {/* Results */}
                {!loading && searched && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                Ledger Results <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '0.85rem', marginLeft: '0.5rem' }}>({results.length} matches found)</span>
                            </h3>
                        </div>

                        {results.length > 0 ? (
                            <div 
                                style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', 
                                    gap: '1.5rem' 
                                }}
                            >
                                {results.map((prop) => {
                                    const sc = getStatusConfig(prop.verificationStatus || prop.status);
                                    return (
                                        <div
                                            key={prop._id || prop.id}
                                            className="digi-card"
                                            style={{ 
                                                background: '#0F172A',
                                                border: '1px solid #1E293B',
                                                borderRadius: '12px',
                                                padding: '1.5rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                transition: 'border-color 0.15s ease'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = '#38BDF8'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = '#1E293B'}
                                            onClick={() => navigate(`/properties/${prop._id || prop.id}`)}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                    <div>
                                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                                            {prop.surveyNumber || prop.details?.surveyNumber || 'Survey Unknown'}
                                                        </h3>
                                                        <p style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#38BDF8', margin: '2px 0 0 0', fontWeight: 600 }}>
                                                            {prop.propertyCode || `DV-${(prop._id || prop.id).slice(0, 6)}`}
                                                        </p>
                                                    </div>
                                                    
                                                    <div 
                                                        style={{ 
                                                            padding: '0.3rem 0.65rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            background: sc.bg,
                                                            border: `1px solid ${sc.border}`,
                                                            color: sc.color
                                                        }}
                                                    >
                                                        {sc.label}
                                                    </div>
                                                </div>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.82rem', marginBottom: '1rem' }}>
                                                    <MapPin size={14} style={{ color: '#0284C7' }} />
                                                    {(prop.district || prop.details?.district) || 'Unknown District'}{(prop.state || prop.details?.state) ? `, ${prop.state || prop.details?.state}` : ''}
                                                </div>

                                                <div 
                                                    style={{ 
                                                        display: 'grid', 
                                                        gridTemplateColumns: '1fr 1fr', 
                                                        gap: '0.75rem', 
                                                        padding: '0.85rem', 
                                                        background: '#0B0F19', 
                                                        border: '1px solid #1E293B', 
                                                        borderRadius: '8px', 
                                                        marginBottom: '1rem' 
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Total Area</div>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC' }}>
                                                            {(prop.areaSqft || prop.details?.area) ? (prop.areaSqft || prop.details?.area).toLocaleString() + ' sq.ft' : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Encumbrance</div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: !prop.encumbranceStatus ? '#10B981' : '#EF4444' }}>
                                                            {!prop.encumbranceStatus ? 'Clear Title' : 'Disputed'}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {(prop.nftTokenId || prop.details?.nftTokenId) && (
                                                    <div style={{ marginBottom: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#38BDF8', background: '#1E293B', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #334155', fontWeight: 600 }}>
                                                            Token #{prop.nftTokenId || prop.details?.nftTokenId}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'flex-end' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38BDF8', fontSize: '0.82rem', fontWeight: 600 }}>
                                                    View Cadastral Deed <ArrowRight size={14} />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: '#0F172A', borderRadius: '12px', border: '1px dashed #334155' }}>
                                <Globe size={40} style={{ color: '#64748B', margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>No Matches Found</h3>
                                <p style={{ color: '#94A3B8', maxWidth: '400px', margin: '0 auto', fontSize: '0.88rem' }}>
                                    The distributed ledger returned zero matches for <strong style={{ color: '#F8FAFC' }}>"{query}"</strong>. Try checking the survey number or district spelling.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchProperty;
