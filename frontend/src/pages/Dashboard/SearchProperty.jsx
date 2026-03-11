import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { Search, MapPin, Building, Key, Ruler, ArrowRight, Loader2 } from 'lucide-react';
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
            const response = await propertyService.searchProperties(query);
            setResults(response.data.data.properties);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    };

    const getStatusConfig = (status) => {
        const s = status?.toUpperCase();
        switch (s) {
            case 'ACTIVE':
            case 'VERIFIED': return { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Verified' };
            case 'PENDING': return { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: 'Pending Assessment' };
            case 'REJECTED': return { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Rejected' };
            case 'FROZEN': return { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Frozen' };
            default: return { bg: 'bg-white/5', text: 'text-gray-400', label: status || 'Unknown' };
        }
    };

    return (
        <div className="property-page-container">
            <div className="property-header">
                <div className="flex-1">
                    <h1 className="property-title">Search Assets</h1>
                    <p className="property-subtitle">Find registered properties across the blockchain</p>
                </div>
            </div>

            <div className="card-glass-panel p-6 mb-8">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by survey number, state, district..."
                            className="input-field pl-12 w-full h-12 text-lg"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="btn-primary px-8 h-12 text-lg font-bold min-w-[140px]"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Search'}
                    </button>
                </form>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-primary-base/20 border-t-primary-base animate-spin mb-4"></div>
                    <p className="text-muted font-mono">Querying decentralized registry...</p>
                </div>
            ) : searched ? (
                results.length > 0 ? (
                    <div className="property-grid">
                        {results.map((property) => {
                            const status = getStatusConfig(property.status);
                            return (
                                <div key={property.id} className="property-card group">
                                    <div className="property-card-header">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 rounded-xl bg-white/5 group-hover:bg-primary-base/20 transition-colors">
                                                <Building size={24} className="text-primary-base" />
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border border-current/20 ${status.bg} ${status.text}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
                                            Survey: {property.details.surveyNumber}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-muted">
                                            <MapPin size={14} className="text-primary-base/70" />
                                            <span className="truncate">{property.details.district}, {property.details.state}</span>
                                        </div>
                                    </div>

                                    <div className="property-card-body">
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="stat-sm">
                                                <span className="stat-label">
                                                    <Ruler size={12} /> Area
                                                </span>
                                                <span className="stat-value">{property.details.area} Units</span>
                                            </div>
                                            <div className="stat-sm">
                                                <span className="stat-label">
                                                    <Key size={12} /> Type
                                                </span>
                                                <span className="stat-value">{property.details.propertyType}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => navigate(`/properties/${property.id}`)}
                                            className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-primary-base/20 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 group-hover:text-primary-base border border-white/5 group-hover:border-primary-base/30"
                                        >
                                            View Details
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-muted" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Properties Found</h3>
                        <p className="text-muted max-w-md mx-auto">
                            We couldn't find any properties matching "{query}". Try searching with different keywords like state or district.
                        </p>
                    </div>
                )
            ) : null}
        </div>
    );
};

export default SearchProperty;
