import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { Search, MapPin, Building, Activity, ArrowRight, Loader2, Globe, Database } from 'lucide-react';
import './PropertyPages.css';

const SearchProperty = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            // Mapping query directly to 'district' or letting the backend handle it as a fuzzy param if supported
            // Right now we just pass it as 'district' since the backend handles district, state, status.
            const response = await propertyService.searchProperties(query);
            // Handling both potential paths based on backend differences
            setResults(response.data.data.properties || response.data.data || []);
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
            case 'approved': return { color: '#00E5FF', bg: 'rgba(0,229,255,0.1)', label: s === 'active' ? 'Active' : 'Verified' };
            case 'pending': return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'Pending Assessment' };
            case 'rejected': return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Rejected' };
            case 'frozen': return { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', label: 'Frozen Asset' };
            case 'under_dispute': return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Disputed' };
            default: return { color: '#9ca3af', bg: 'rgba(255,255,255,0.05)', label: status || 'Unknown' };
        }
    };

    return (
        <div className="property-container container-sm animate-fade-in" style={{ paddingBottom: '4rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{
                    width: '3.5rem', height: '3.5rem', borderRadius: '12px',
                    background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(0,229,255,0.2)'
                }}>
                    <Search size={24} style={{ color: '#00E5FF' }} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white' }}>
                        Decentralized Property Search
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.3rem', margin: 0 }}>
                        Query the distributed ledger for verified real estate parameters
                    </p>
                </div>
            </div>

            {/* Search HUD */}
            <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem 2.5rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
                <div className="cyber-card-glow-orb" style={{ background: '#00E5FF', top: '-20%', right: '-5%', opacity: 0.1, width: '15rem', height: '15rem' }}></div>
                
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 10 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#00E5FF' }}>
                            <Database size={20} />
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Query by Survey Number, District, or Global Node State..."
                            style={{
                                width: '100%', padding: '1.2rem 1rem 1.2rem 3.5rem', background: 'rgba(0,0,0,0.5)',
                                border: '1px solid rgba(0,229,255,0.3)', borderRadius: '12px', color: 'white',
                                fontSize: '1.05rem', fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s ease',
                                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="cyber-btn-hollow"
                        style={{ '--btn-color': '#00E5FF', width: '180px', fontSize: '1.05rem', padding: '0 2rem', borderStyle: 'solid' }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : 'Execute Query'}
                    </button>
                </form>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', position: 'relative', zIndex: 10 }}>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Suggested Nodes:</span>
                    <button type="button" onClick={() => setQuery('Mumbai')} style={{ fontSize: '0.75rem', color: '#00E5FF', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>[Mumbai]</button>
                    <button type="button" onClick={() => setQuery('Active')} style={{ fontSize: '0.75rem', color: '#FF007F', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>[Verified Status]</button>
                    <button type="button" onClick={() => setQuery('Urban')} style={{ fontSize: '0.75rem', color: '#00E5FF', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>[Urban Sector]</button>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div style={{ padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(0,229,255,0.2)' }}>
                        <Loader2 size={32} className="animate-spin" style={{ color: '#00E5FF' }} />
                    </div>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', color: '#00E5FF', fontSize: '0.9rem', letterSpacing: '0.1em' }}>QUERYING BLOCKCHAIN LEDGER...</p>
                </div>
            )}

            {/* Results */}
            {!loading && searched && (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>
                            Ledger Results <span style={{ color: '#9ca3af', fontWeight: 500, fontSize: '0.9rem', marginLeft: '0.5rem' }}>({results.length} matches)</span>
                        </h3>
                    </div>

                    {results.length > 0 ? (
                        <div className="cyber-grid-layout">
                            {results.map((prop, idx) => {
                                const sc = getStatusConfig(prop.verificationStatus || prop.status);
                                return (
                                    <div
                                        key={prop._id || prop.id}
                                        className="cyber-property-card"
                                        style={{ 
                                            '--tier-color': sc.color, 
                                            '--tier-color-hover': sc.color,
                                            '--tier-glow': sc.bg,
                                            animationDelay: `${idx * 0.05}s`
                                        }}
                                        onClick={() => navigate(`/properties/${prop._id || prop.id}`)}
                                    >
                                        <div className="cyber-card-glow-orb" style={{ background: sc.color }}></div>
                                        
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-xl font-bold tracking-tight text-white mb-1">
                                                    {prop.surveyNumber || prop.details?.surveyNumber || 'Survey Unknown'}
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
                                                {(prop.district || prop.details?.district) || 'Unknown District'}{(prop.state || prop.details?.state) ? `, ${prop.state || prop.details?.state}` : ''}
                                            </div>

                                            <div className="cyber-data-grid">
                                                <div className="cyber-data-item">
                                                    <div className="label">Total Area</div>
                                                    <div className="value">{(prop.areaSqft || prop.details?.area) ? (prop.areaSqft || prop.details?.area).toLocaleString() + ' sq.ft' : 'N/A'}</div>
                                                </div>
                                                <div className="cyber-data-item">
                                                    <div className="label">Encumbrance</div>
                                                    <div className="value" style={{ color: !prop.encumbranceStatus ? '#00E5FF' : '#FF007F' }}>
                                                        {!prop.encumbranceStatus ? 'Clear' : 'Flagged'}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {(prop.nftTokenId || prop.details?.nftTokenId) && (
                                                <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                                                    <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#FF007F', background: 'rgba(255,0,127,0.1)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(255,0,127,0.2)' }}>
                                                        Token: #{prop.nftTokenId || prop.details?.nftTokenId}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: sc.color, fontSize: '0.85rem', fontWeight: 700 }}>
                                                Access Records <ArrowRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: '5rem 0', textAlign: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Globe size={40} style={{ color: '#6b7280' }} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>No Matches Identified</h3>
                            <p style={{ color: '#9ca3af', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
                                The distributed ledger returned zero matches for the parameters <span style={{ color: 'white', fontWeight: 600 }}>"{query}"</span>. Alter your search vectors and execute again.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchProperty;
