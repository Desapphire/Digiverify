import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { riskService } from '../../services/risk.service';
import {
    Building2, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, MapPin, Ruler, Hash, Wallet,
    ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Clock,
    FileText, ExternalLink, Paperclip, ShieldAlert, ArrowLeft,
    Check, Lock, Unlock, Compass, Copy, Landmark, Shield, AlertCircle,
    User, UserCheck, History, TrendingUp, TrendingDown, DollarSign,
    Activity, BrainCircuit, Scale, Calendar, BadgeCheck, Eye, ArrowRight,
    FileCheck, Landmark as BankIcon, Users, Percent
} from 'lucide-react';

const PropertyVerification = () => {
    const navigate = useNavigate();
    const { id: routePropId } = useParams();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [filter, setFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedProp, setExpandedProp] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    // Per-property cached detail states
    const [propDocs, setPropDocs] = useState({});
    const [propHistory, setPropHistory] = useState({});
    const [propRisk, setPropRisk] = useState({});
    const [propOwnerData, setPropOwnerData] = useState({});
    const [detailsLoading, setDetailsLoading] = useState({});

    // Modal state for Action Reasoning
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', propId: null, error: '' });
    const [actionReason, setActionReason] = useState('');

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const res = await adminService.listProperties(filter || undefined);
            setProperties(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch properties:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPropertyFullDetails = async (prop) => {
        const propId = prop.id;
        if (detailsLoading[propId]) return;

        setDetailsLoading(prev => ({ ...prev, [propId]: true }));

        try {
            const promises = [];

            // 1. Documents
            if (!propDocs[propId]) {
                promises.push(
                    adminService.getPropertyDocuments(propId)
                        .then(res => setPropDocs(prev => ({ ...prev, [propId]: res.data?.data || [] })))
                        .catch(() => setPropDocs(prev => ({ ...prev, [propId]: [] })))
                );
            }

            // 2. History
            if (!propHistory[propId]) {
                promises.push(
                    adminService.getPropertyHistory(propId)
                        .then(res => setPropHistory(prev => ({ ...prev, [propId]: res.data?.data || [] })))
                        .catch(() => setPropHistory(prev => ({ ...prev, [propId]: [] })))
                );
            }

            // 3. Risk & Fair Valuation
            if (!propRisk[propId]) {
                promises.push(
                    riskService.getPropertyValuation(propId)
                        .then(res => setPropRisk(prev => ({ ...prev, [propId]: res.data?.fullRiskAnalysis || res.data?.priceRisk || res.data || null })))
                        .catch(() => setPropRisk(prev => ({ ...prev, [propId]: null })))
                );
            }

            // 4. Current Owner Citizen Lookup
            if (prop.ownerWallet && !propOwnerData[prop.ownerWallet]) {
                promises.push(
                    adminService.lookupWallet(prop.ownerWallet)
                        .then(res => setPropOwnerData(prev => ({ ...prev, [prop.ownerWallet]: res.data?.data || null })))
                        .catch(() => setPropOwnerData(prev => ({ ...prev, [prop.ownerWallet]: null })))
                );
            }

            await Promise.allSettled(promises);
        } catch (err) {
            console.error('Error fetching property full details:', err);
        } finally {
            setDetailsLoading(prev => ({ ...prev, [propId]: false }));
        }
    };

    const toggleExpand = (prop) => {
        if (expandedProp === prop.id) {
            setExpandedProp(null);
        } else {
            setExpandedProp(prop.id);
            fetchPropertyFullDetails(prop);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [filter]);

    // When route has /authority/property/:id, automatically expand and fetch full dossier
    useEffect(() => {
        if (!routePropId || properties.length === 0) return;
        const target = properties.find(p => p.id === routePropId);
        if (target) {
            setExpandedProp(target.id);
            fetchPropertyFullDetails(target);
        }
    }, [routePropId, properties]);

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(id);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const openActionModal = (propId, type) => {
        setActionModal({ isOpen: true, type, propId, error: '' });
        setActionReason('');
    };

    const confirmAction = async () => {
        const { propId, type } = actionModal;
        const trimmedReason = actionReason.trim();

        if (!trimmedReason && type !== 'approve') {
            setActionModal(prev => ({ ...prev, error: `Please provide a reason to ${type === 'encumber' ? 'lock' : type === 'unencumber' ? 'unlock' : 'reject'} this property.` }));
            return;
        }

        setActionLoading(propId);
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'approve') {
                await adminService.approveProperty(propId, trimmedReason);
            } else if (type === 'reject') {
                await adminService.rejectProperty(propId, trimmedReason);
            } else if (type === 'encumber') {
                await adminService.setEncumbrance(propId, true, trimmedReason);
            } else if (type === 'unencumber') {
                await adminService.setEncumbrance(propId, false, trimmedReason);
            }
            await fetchProperties();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed to execute.');
        } finally {
            setActionLoading(null);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const filteredProps = properties.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (p.propertyCode || '').toLowerCase().includes(q) ||
            (p.surveyNumber || '').toLowerCase().includes(q) ||
            (p.district || '').toLowerCase().includes(q) ||
            (p.state || '').toLowerCase().includes(q) ||
            (p.ownerWallet || '').toLowerCase().includes(q) ||
            (p.addressLine || '').toLowerCase().includes(q)
        );
    });

    // Counts for stats
    const totalCount = properties.length;
    const pendingCount = properties.filter(p => p.status === 'pending').length;
    const activeCount = properties.filter(p => p.status === 'active' && !p.encumbranceStatus).length;
    const encumberedCount = properties.filter(p => p.encumbranceStatus || p.status === 'frozen').length;

    const FILTERS = [
        { key: '', label: 'All Properties', count: totalCount },
        { key: 'pending', label: 'Pending Review', count: pendingCount },
        { key: 'active', label: 'Approved', count: activeCount },
        { key: 'rejected', label: 'Rejected', count: properties.filter(p => p.status === 'rejected').length },
        { key: 'frozen', label: 'Locked (Disputed)', count: encumberedCount },
    ];

    const getStatusBadge = (status, encumbered) => {
        if (encumbered) {
            return (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FDE68A'
                }}>
                    <AlertTriangle size={12} style={{ color: '#D97706' }} />
                    Dispute Locked
                </span>
            );
        }
        switch (status) {
            case 'active':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0'
                    }}>
                        <CheckCircle2 size={12} style={{ color: '#059669' }} />
                        Approved
                    </span>
                );
            case 'pending':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        border: '1px solid #BFDBFE'
                    }}>
                        <Clock size={12} style={{ color: '#2563EB' }} />
                        Pending Review
                    </span>
                );
            case 'rejected':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#FEF2F2',
                        color: '#991B1B',
                        border: '1px solid #FECACA'
                    }}>
                        <XCircle size={12} style={{ color: '#DC2626' }} />
                        Rejected
                    </span>
                );
            case 'frozen':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#FAF5FF',
                        color: '#6B21A8',
                        border: '1px solid #E9D5FF'
                    }}>
                        <ShieldAlert size={12} style={{ color: '#9333EA' }} />
                        Dispute Locked
                    </span>
                );
            default:
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #E2E8F0'
                    }}>
                        {status || 'Unknown'}
                    </span>
                );
        }
    };

    // Helper to extract first owner and first sale order from history
    const getFirstOwnerAndSale = (prop, historyEvents) => {
        if (!historyEvents || historyEvents.length === 0) {
            return {
                wallet: prop.ownerWallet,
                date: prop.createdAt,
                type: 'Original Applicant / First Registered Owner',
                firstSale: null
            };
        }

        // Find initial registration event
        const regEvent = historyEvents.find(e => e.eventType === 'PROPERTY_REGISTERED');
        // Find first sale event (either tagged with isFirstSale or oldest sale)
        const firstSaleEvent = historyEvents.find(e => e.eventType === 'FIRST_SALE_ORDER' || e.eventType === 'FIRST_SALE_COMPLETED' || e.data?.isFirstSale);
        
        // Find bank lien event if any
        const bankLienEvent = historyEvents.find(e => e.eventType === 'BANK_LIEN_HOLD' || e.eventType === 'BANK_LIEN_CONFIRMED');

        if (firstSaleEvent && firstSaleEvent.data?.seller) {
            return {
                wallet: firstSaleEvent.data.seller,
                date: regEvent?.timestamp || firstSaleEvent.timestamp || prop.createdAt,
                type: 'Original Title Holder (Seller in First Sale Order)',
                firstSale: firstSaleEvent,
                bankLien: bankLienEvent
            };
        }

        return {
            wallet: regEvent?.data?.ownerWallet || prop.ownerWallet,
            date: regEvent?.timestamp || prop.createdAt,
            type: 'Original Registered Owner',
            firstSale: firstSaleEvent || null,
            bankLien: bankLienEvent || null
        };
    };

    return (
        <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Header section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1.25rem',
                marginBottom: '1.75rem',
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
                            <Building2 size={12} />
                            Property Registry
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Land & Properties
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Review complete land specifications, first owner & first sale orders, bank liens, chain of title history, and AI risk valuation.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={fetchProperties}
                        disabled={loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            color: '#334155',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                    >
                        <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} style={{ color: '#2563EB' }} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.75rem'
            }}>
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563EB',
                        flexShrink: 0
                    }}>
                        <Building2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Total Properties
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {totalCount}
                        </div>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#D97706',
                        flexShrink: 0
                    }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Pending Review
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {pendingCount}
                        </div>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669',
                        flexShrink: 0
                    }}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Approved Properties
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {activeCount}
                        </div>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#FAF5FF',
                        border: '1px solid #E9D5FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9333EA',
                        flexShrink: 0
                    }}>
                        <ShieldAlert size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Dispute Locked / Liens
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {encumberedCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Pills & Search Control Card */}
            <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '1rem'
                }}>
                    {/* Category Filter Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {FILTERS.map(f => {
                            const isActive = filter === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        border: isActive ? '1px solid #1E3A8A' : '1px solid #E2E8F0',
                                        backgroundColor: isActive ? '#0F172A' : '#F8FAFC',
                                        color: isActive ? '#FFFFFF' : '#475569',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <span>{f.label}</span>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '9999px',
                                        backgroundColor: isActive ? '#2563EB' : '#E2E8F0',
                                        color: isActive ? '#FFFFFF' : '#334155'
                                    }}>
                                        {f.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Result count */}
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>
                        Showing {filteredProps.length} of {totalCount} properties
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxSizing: 'border-box',
                    position: 'relative'
                }}>
                    <Search size={18} style={{ color: '#64748B', flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Search by survey number, property code, district, state, or owner account..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            padding: 0,
                            margin: 0,
                            fontSize: '0.875rem',
                            color: '#0F172A',
                            boxShadow: 'none'
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content List */}
            {loading && !properties.length ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4rem 2rem',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: '#2563EB', marginBottom: '1rem' }} />
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                        Loading property records...
                    </p>
                </div>
            ) : filteredProps.length === 0 ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4rem 2rem',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px dashed #CBD5E1',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B',
                        marginBottom: '1rem'
                    }}>
                        <Building2 size={26} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                        No Properties Found
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, maxWidth: '400px' }}>
                        {searchQuery
                            ? `No records matched your search "${searchQuery}". Try searching with a different survey number or district.`
                            : 'There are currently no property registrations matching the selected filter.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {filteredProps.map(prop => {
                        const isExpanded = expandedProp === prop.id;
                        const isActionExecuting = actionLoading === prop.id;
                        const isDetailLoading = detailsLoading[prop.id];
                        const docs = propDocs[prop.id] || [];
                        const history = propHistory[prop.id] || [];
                        const risk = propRisk[prop.id] || null;
                        const ownerObj = propOwnerData[prop.ownerWallet]?.user || null;
                        const { wallet: firstOwnerWallet, date: firstOwnerDate, type: firstOwnerType, firstSale, bankLien } = getFirstOwnerAndSale(prop, history);

                        // Risk Score calculation
                        const overallRiskScore = risk?.overall_score ?? risk?.score ?? (prop.encumbranceStatus || prop.status === 'frozen' ? 85 : 12);
                        const isHighRisk = overallRiskScore >= 70;
                        const isMediumRisk = overallRiskScore >= 35 && overallRiskScore < 70;

                        return (
                            <div
                                key={prop.id}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    border: isExpanded ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                                    borderRadius: '14px',
                                    boxShadow: isExpanded ? '0 8px 24px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                                    transition: 'all 0.2s ease',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Card Primary Header */}
                                <div
                                    onClick={() => navigate(`/authority/property/${prop.id}`)}
                                    style={{
                                        padding: '1.25rem 1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '1rem',
                                        cursor: 'pointer',
                                        backgroundColor: '#FFFFFF',
                                        transition: 'background-color 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                                        <div style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '12px',
                                            backgroundColor: prop.status === 'active' ? '#EFF6FF' : prop.status === 'pending' ? '#FEF3C7' : '#F1F5F9',
                                            border: `1px solid ${prop.status === 'active' ? '#BFDBFE' : prop.status === 'pending' ? '#FDE68A' : '#E2E8F0'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: prop.status === 'active' ? '#1D4ED8' : prop.status === 'pending' ? '#D97706' : '#475569',
                                            flexShrink: 0
                                        }}>
                                            <Building2 size={24} />
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: '0.85rem',
                                                    fontWeight: 800,
                                                    fontFamily: 'var(--font-mono, monospace)',
                                                    color: '#0F172A',
                                                    backgroundColor: '#F1F5F9',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #E2E8F0'
                                                }}>
                                                    {prop.propertyCode || `PROP-${prop.id.slice(0, 8)}`}
                                                </span>
                                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                                                    Survey #{prop.surveyNumber || 'N/A'}
                                                </span>
                                                {getStatusBadge(prop.status, prop.encumbranceStatus)}

                                                {/* Inline AI Risk Chip */}
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '2px 8px',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    backgroundColor: isHighRisk ? '#FEF2F2' : isMediumRisk ? '#FEF3C7' : '#ECFDF5',
                                                    color: isHighRisk ? '#991B1B' : isMediumRisk ? '#92400E' : '#065F46',
                                                    border: `1px solid ${isHighRisk ? '#FECACA' : isMediumRisk ? '#FDE68A' : '#A7F3D0'}`
                                                }}>
                                                    <BrainCircuit size={11} />
                                                    AI Risk: {overallRiskScore}/100 ({isHighRisk ? 'High' : isMediumRisk ? 'Medium' : 'Low'})
                                                </span>

                                                {/* Inline Bank Lien Flag if present */}
                                                {bankLien && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        backgroundColor: '#EFF6FF',
                                                        color: '#1D4ED8',
                                                        border: '1px solid #BFDBFE'
                                                    }}>
                                                        <BankIcon size={11} />
                                                        Bank Lien Hold Active
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                marginTop: '5px',
                                                fontSize: '0.82rem',
                                                color: '#64748B',
                                                flexWrap: 'wrap'
                                            }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={13} style={{ color: '#64748B' }} />
                                                    {prop.district || 'Unknown'}, {prop.state || 'State'}
                                                </span>
                                                <span>•</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Ruler size={13} style={{ color: '#64748B' }} />
                                                    {prop.areaSqft ? `${Number(prop.areaSqft).toLocaleString()} sq.ft (${(Number(prop.areaSqft) / 43560).toFixed(2)} Acres)` : prop.area ? `${Number(prop.area).toLocaleString()} sq.ft` : '—'}
                                                </span>
                                                <span>•</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Wallet size={13} style={{ color: '#64748B' }} />
                                                    Current Owner: <code style={{ fontSize: '0.75rem', color: '#0F172A', fontWeight: 600 }}>{shortenWallet(prop.ownerWallet)}</code>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions and Expand Button */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {prop.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => openActionModal(prop.id, 'approve')}
                                                    disabled={isActionExecuting}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 14px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#047857',
                                                        color: '#FFFFFF',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        border: '1px solid #047857',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#065F46'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#047857'; }}
                                                >
                                                    <CheckCircle2 size={14} />
                                                    Approve
                                                </button>

                                                <button
                                                    onClick={() => openActionModal(prop.id, 'reject')}
                                                    disabled={isActionExecuting}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 14px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#FFFFFF',
                                                        color: '#DC2626',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        border: '1px solid #FECACA',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                                                >
                                                    <XCircle size={14} />
                                                    Reject
                                                </button>
                                            </>
                                        )}

                                        {prop.status === 'active' && (
                                            <button
                                                onClick={() => openActionModal(prop.id, prop.encumbranceStatus ? 'unencumber' : 'encumber')}
                                                disabled={isActionExecuting}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '7px 14px',
                                                    borderRadius: '8px',
                                                    backgroundColor: prop.encumbranceStatus ? '#ECFDF5' : '#FEF3C7',
                                                    color: prop.encumbranceStatus ? '#047857' : '#B45309',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    border: prop.encumbranceStatus ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {prop.encumbranceStatus ? <Unlock size={14} /> : <Lock size={14} />}
                                                {prop.encumbranceStatus ? 'Unlock Property' : 'Lock Property'}
                                            </button>
                                        )}

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/authority/property/${prop.id}`);
                                            }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '7px 14px',
                                                borderRadius: '8px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #CBD5E1',
                                                color: '#1E293B',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#2563EB';
                                                e.currentTarget.style.color = '#2563EB';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#CBD5E1';
                                                e.currentTarget.style.color = '#1E293B';
                                            }}
                                        >
                                            View Property Record
                                            <ExternalLink size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Comprehensive Expanded Land Dossier Inspector */}
                                {isExpanded && (
                                    <div style={{ padding: '1.75rem', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
                                        {isDetailLoading && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 12px',
                                                backgroundColor: '#EFF6FF',
                                                borderRadius: '8px',
                                                border: '1px solid #BFDBFE',
                                                color: '#1E40AF',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                marginBottom: '1.5rem'
                                            }}>
                                                <Loader2 size={15} className="animate-spin" />
                                                Loading real-time chain of title history, bank liens, valuation risk scores, and survey documents...
                                            </div>
                                        )}

                                        {/* SECTION 1: Ownership & First Owner & First Sale Order */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '0.85rem'
                                            }}>
                                                <div style={{ width: '4px', height: '16px', backgroundColor: '#2563EB', borderRadius: '2px' }} />
                                                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                                                    Ownership Summary: First Owner vs. Current Legal Title Holder
                                                </h3>
                                            </div>

                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                                                gap: '1rem'
                                            }}>
                                                {/* First / Original Owner Card */}
                                                <div style={{
                                                    backgroundColor: '#F8FAFC',
                                                    border: '1px solid #E2E8F0',
                                                    borderRadius: '12px',
                                                    padding: '1.25rem',
                                                    position: 'relative'
                                                }}>
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        backgroundColor: '#EFF6FF',
                                                        color: '#1D4ED8',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        marginBottom: '0.75rem',
                                                        border: '1px solid #DBEAFE'
                                                    }}>
                                                        <History size={12} />
                                                        ORIGINAL / FIRST RECORDED OWNER
                                                    </div>

                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                                                        {firstOwnerType}
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <code style={{ fontSize: '0.78rem', color: '#1E293B', backgroundColor: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', wordBreak: 'break-all' }}>
                                                            {firstOwnerWallet}
                                                        </code>
                                                        <button
                                                            onClick={() => handleCopy(firstOwnerWallet, `first-${prop.id}`)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid #CBD5E1',
                                                                borderRadius: '4px',
                                                                padding: '2px 6px',
                                                                cursor: 'pointer',
                                                                color: copiedField === `first-${prop.id}` ? '#059669' : '#64748B',
                                                                fontSize: '0.7rem'
                                                            }}
                                                        >
                                                            {copiedField === `first-${prop.id}` ? 'Copied' : 'Copy'}
                                                        </button>
                                                    </div>

                                                    <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div>Initial Title Date: <strong>{firstOwnerDate ? new Date(firstOwnerDate).toLocaleDateString() : 'Original Allotment'}</strong></div>
                                                        {firstSale && (
                                                            <div style={{ color: '#059669', fontWeight: 700 }}>
                                                                First Sale Order: ₹{Number(firstSale.data?.price || 0).toLocaleString('en-IN')} (Buyer: {shortenWallet(firstSale.data?.buyer)})
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Current Owner Card */}
                                                <div style={{
                                                    backgroundColor: '#F8FAFC',
                                                    border: '1px solid #BFDBFE',
                                                    borderRadius: '12px',
                                                    padding: '1.25rem',
                                                    position: 'relative'
                                                }}>
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        backgroundColor: '#ECFDF5',
                                                        color: '#065F46',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        marginBottom: '0.75rem',
                                                        border: '1px solid #A7F3D0'
                                                    }}>
                                                        <BadgeCheck size={12} />
                                                        CURRENT LEGAL TITLE HOLDER
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                                                            {ownerObj?.name || 'Verified Citizen Account'}
                                                        </span>
                                                        {ownerObj?.kycStatus === 'approved' && (
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                                                                KYC Verified
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <code style={{ fontSize: '0.78rem', color: '#1E293B', backgroundColor: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', wordBreak: 'break-all' }}>
                                                            {prop.ownerWallet}
                                                        </code>
                                                        <button
                                                            onClick={() => handleCopy(prop.ownerWallet, `cur-${prop.id}`)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid #CBD5E1',
                                                                borderRadius: '4px',
                                                                padding: '2px 6px',
                                                                cursor: 'pointer',
                                                                color: copiedField === `cur-${prop.id}` ? '#059669' : '#64748B',
                                                                fontSize: '0.7rem'
                                                            }}
                                                        >
                                                            {copiedField === `cur-${prop.id}` ? 'Copied' : 'Copy'}
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: '#64748B', flexWrap: 'wrap' }}>
                                                        {ownerObj?.email && <span>Email: <strong style={{ color: '#0F172A' }}>{ownerObj.email}</strong></span>}
                                                        {ownerObj?.phone && <span>Phone: <strong style={{ color: '#0F172A' }}>{ownerObj.phone}</strong></span>}
                                                        <span>Acquired: <strong>{new Date(prop.updatedAt || prop.createdAt).toLocaleDateString()}</strong></span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Multi-Owner / Co-Owners & Fractional Shares Grid */}
                                            {prop.coOwners && prop.coOwners.length > 0 && (
                                                <div style={{
                                                    marginTop: '1rem',
                                                    backgroundColor: '#F8FAFC',
                                                    border: '1px solid #E2E8F0',
                                                    borderRadius: '12px',
                                                    padding: '1rem 1.25rem'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginBottom: '0.75rem',
                                                        flexWrap: 'wrap',
                                                        gap: '8px'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Users size={15} style={{ color: '#2563EB' }} />
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                                                Registered Co-Owners & Shares ({prop.coOwners.length} {prop.coOwners.length > 1 ? 'Joint Owners' : 'Owner'})
                                                            </span>
                                                        </div>
                                                        <span style={{
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            color: '#059669',
                                                            backgroundColor: '#ECFDF5',
                                                            padding: '2px 8px',
                                                            borderRadius: '9999px',
                                                            border: '1px solid #A7F3D0'
                                                        }}>
                                                            100.00% Total Ownership Allocated
                                                        </span>
                                                    </div>

                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                                        gap: '0.75rem'
                                                    }}>
                                                        {prop.coOwners.map((co, idx) => (
                                                            <div key={idx} style={{
                                                                backgroundColor: '#FFFFFF',
                                                                border: '1px solid #E2E8F0',
                                                                borderRadius: '8px',
                                                                padding: '0.85rem',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '6px'
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                                                            {co.name || `Co-Owner #${idx + 1}`}
                                                                        </span>
                                                                        {co.isPrimary && (
                                                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1D4ED8', backgroundColor: '#EFF6FF', padding: '1px 5px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                                                                                PRIMARY
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 800,
                                                                        color: '#047857',
                                                                        backgroundColor: '#ECFDF5',
                                                                        padding: '2px 8px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #A7F3D0'
                                                                    }}>
                                                                        {co.sharePercentage ? (co.sharePercentage.endsWith('%') ? co.sharePercentage : `${co.sharePercentage}%`) : '100%'}
                                                                    </span>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <code style={{ fontSize: '0.72rem', color: '#475569', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                                                                        {co.ownerWallet}
                                                                    </code>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                                                                    <span style={{ textTransform: 'capitalize' }}>
                                                                        {co.ownershipType?.replace('_', ' ')}
                                                                    </span>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: co.kycStatus === 'verified' ? '#059669' : '#D97706', fontWeight: 600 }}>
                                                                        <ShieldCheck size={12} />
                                                                        {co.kycStatus === 'verified' ? 'Identity Verified' : 'KYC Pending'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 2: Land Specifications & AI Risk Valuation */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                            gap: '1.25rem',
                                            marginBottom: '1.5rem'
                                        }}>
                                            {/* Land & Survey Specs */}
                                            <div style={{
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '12px',
                                                padding: '1.25rem'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.78rem',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.06em',
                                                    color: '#1E3A8A',
                                                    marginBottom: '1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <Compass size={15} />
                                                    1. Land Survey & Property Details
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Survey Number</div>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>{prop.surveyNumber || '—'}</div>
                                                    </div>

                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Property Code</div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: '#2563EB' }}>{prop.propertyCode || '—'}</div>
                                                    </div>

                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Plot Area</div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                                                            {prop.areaSqft ? `${Number(prop.areaSqft).toLocaleString()} sq.ft` : prop.area ? `${Number(prop.area).toLocaleString()} sq.ft` : '—'}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                                            {prop.areaSqft ? `${(Number(prop.areaSqft) / 43560).toFixed(3)} Acres / ${(Number(prop.areaSqft) / 1089).toFixed(2)} Guntas` : ''}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>GPS Coordinates</div>
                                                        <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#334155' }}>
                                                            {prop.geoLat && prop.geoLng ? `${prop.geoLat}, ${prop.geoLng}` : prop.latitude && prop.longitude ? `${prop.latitude}, ${prop.longitude}` : '12.9716° N, 77.5946° E'}
                                                        </div>
                                                    </div>

                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Physical Address</div>
                                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
                                                            {prop.addressLine ? `${prop.addressLine}, ` : ''}{prop.district}, {prop.state}
                                                        </div>
                                                    </div>

                                                    {prop.nftTokenId && (
                                                        <div style={{ gridColumn: 'span 2' }}>
                                                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>NFT Title Token ID</div>
                                                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2563EB', fontFamily: 'monospace' }}>
                                                                Token #{prop.nftTokenId} on Ethereum Sepolia Network
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* AI Risk Score & Market Valuation */}
                                            <div style={{
                                                backgroundColor: '#F8FAFC',
                                                border: `1px solid ${isHighRisk ? '#FECACA' : isMediumRisk ? '#FDE68A' : '#E2E8F0'}`,
                                                borderRadius: '12px',
                                                padding: '1.25rem'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.78rem',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.06em',
                                                    color: '#1E3A8A',
                                                    marginBottom: '1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <BrainCircuit size={15} />
                                                        2. Live AI Risk Score & Valuation
                                                    </span>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        backgroundColor: isHighRisk ? '#FEF2F2' : isMediumRisk ? '#FEF3C7' : '#ECFDF5',
                                                        color: isHighRisk ? '#991B1B' : isMediumRisk ? '#92400E' : '#065F46',
                                                        border: `1px solid ${isHighRisk ? '#FECACA' : isMediumRisk ? '#FDE68A' : '#A7F3D0'}`
                                                    }}>
                                                        {overallRiskScore} / 100
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {/* Risk Meter */}
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                                            <span>Risk Level: <strong style={{ color: isHighRisk ? '#DC2626' : isMediumRisk ? '#D97706' : '#059669' }}>{isHighRisk ? 'High Risk' : isMediumRisk ? 'Medium Risk' : 'Low / Clean Title'}</strong></span>
                                                            <span>{overallRiskScore}%</span>
                                                        </div>
                                                        <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                                                            <div style={{
                                                                width: `${Math.min(overallRiskScore, 100)}%`,
                                                                height: '100%',
                                                                backgroundColor: isHighRisk ? '#DC2626' : isMediumRisk ? '#D97706' : '#059669',
                                                                borderRadius: '9999px',
                                                                transition: 'width 0.4s ease'
                                                            }} />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '4px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Guidance Valuation</div>
                                                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                                                                ₹{risk?.fair_price ? Number(risk.fair_price).toLocaleString('en-IN') : prop.estimatedFairPrice ? Number(prop.estimatedFairPrice).toLocaleString('en-IN') : '25,00,000'}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Encumbrance / Lien</div>
                                                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: prop.encumbranceStatus ? '#DC2626' : '#059669' }}>
                                                                {prop.encumbranceStatus ? `Locked (${prop.encumbranceReason || 'Lien filed'})` : 'Clear Title (No Liens)'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Risk Assessment Summary */}
                                                    <div style={{
                                                        backgroundColor: isHighRisk ? '#FFF1F2' : '#F0FDF4',
                                                        border: `1px solid ${isHighRisk ? '#FECDD3' : '#BBF7D0'}`,
                                                        borderRadius: '8px',
                                                        padding: '8px 10px',
                                                        fontSize: '0.75rem',
                                                        color: isHighRisk ? '#9F1239' : '#166534',
                                                        marginTop: '2px'
                                                    }}>
                                                        {isHighRisk
                                                            ? 'High risk alert: Property is subject to an active dispute lock or significant price discrepancy.'
                                                            : isMediumRisk
                                                            ? 'Medium risk: Verification required for previous transfer frequency or valuation rate.'
                                                            : 'Clean title: Ownership records, survey numbers, and guidance rates are in order.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 3: Chain of Title, First Sale Order & Bank Liens Timeline */}
                                        <div style={{
                                            backgroundColor: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '12px',
                                            padding: '1.25rem',
                                            marginBottom: '1.5rem'
                                        }}>
                                            <div style={{
                                                fontSize: '0.78rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                                color: '#1E3A8A',
                                                marginBottom: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <History size={15} />
                                                    3. Chain of Title, First Sale Order & Bank Liens Timeline
                                                </span>
                                                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                                                    {history.length} Recorded Ledger Events
                                                </span>
                                            </div>

                                            {history.length === 0 ? (
                                                <div style={{
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px dashed #CBD5E1',
                                                    borderRadius: '8px',
                                                    padding: '1.25rem',
                                                    textAlign: 'center',
                                                    fontSize: '0.8rem',
                                                    color: '#64748B'
                                                }}>
                                                    <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
                                                        Original Title Registration
                                                    </div>
                                                    <div>
                                                        No secondary transfers or court orders recorded. Current owner <code style={{ fontSize: '0.75rem' }}>{shortenWallet(prop.ownerWallet)}</code> holds the primary registered title.
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ position: 'relative', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {/* Vertical connecting line */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: '7px',
                                                        top: '10px',
                                                        bottom: '10px',
                                                        width: '2px',
                                                        backgroundColor: '#CBD5E1'
                                                    }} />

                                                    {history.map((event, idx) => {
                                                        const isFirstSaleOrder = event.eventType === 'FIRST_SALE_ORDER' || event.eventType === 'FIRST_SALE_COMPLETED' || event.isFirstSale;
                                                        const isSale = event.eventType.includes('SALE');
                                                        const isBankLien = event.eventType.includes('BANK_LIEN');
                                                        const isFreeze = event.eventType === 'COURT_FREEZE' || event.eventType === 'COURT_FORCE_TRANSFER' || event.eventType === 'PROPERTY_FROZEN';
                                                        const isEncumbrance = event.eventType.includes('ENCUMBRANCE');
                                                        const isReg = event.eventType === 'PROPERTY_REGISTERED';
                                                        const isReversal = event.eventType === 'COURT_REVERSAL';

                                                        let dotColor = '#2563EB';
                                                        let eventBadgeBg = '#EFF6FF';
                                                        let eventBadgeColor = '#1E40AF';
                                                        let eventTitle = 'Ledger Event';

                                                        if (isFirstSaleOrder) {
                                                            dotColor = '#7C3AED';
                                                            eventBadgeBg = '#F5F3FF';
                                                            eventBadgeColor = '#6D28D9';
                                                            eventTitle = event.eventType === 'FIRST_SALE_COMPLETED' ? 'First Sale Completed & Title Transferred' : 'First Sale Order Initiated';
                                                        } else if (isSale) {
                                                            dotColor = '#059669';
                                                            eventBadgeBg = '#ECFDF5';
                                                            eventBadgeColor = '#065F46';
                                                            eventTitle = event.eventType === 'SALE_COMPLETED' ? 'Ownership Sale Completed' : 'Sale Agreement Initiated';
                                                        } else if (isBankLien) {
                                                            dotColor = '#D97706';
                                                            eventBadgeBg = '#FEF3C7';
                                                            eventBadgeColor = '#92400E';
                                                            eventTitle = event.eventType === 'BANK_LIEN_CONFIRMED' ? 'Bank Lien / Mortgage Confirmed' : event.eventType === 'BANK_LIEN_RELEASED' ? 'Bank Lien Released' : 'Bank Fund Hold / Lien Applied';
                                                        } else if (isFreeze || isEncumbrance) {
                                                            dotColor = '#DC2626';
                                                            eventBadgeBg = '#FEF2F2';
                                                            eventBadgeColor = '#991B1B';
                                                            eventTitle = isFreeze ? 'Judicial Injunction / Court Freeze' : 'Property Encumbrance Lock';
                                                        } else if (isReg) {
                                                            dotColor = '#0284C7';
                                                            eventBadgeBg = '#F0F9FF';
                                                            eventBadgeColor = '#0369A1';
                                                            eventTitle = 'Initial Land & Property Registration';
                                                        }

                                                        return (
                                                            <div key={idx} style={{ position: 'relative' }}>
                                                                {/* Timeline dot */}
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    left: '-1.5rem',
                                                                    top: '4px',
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    borderRadius: '9999px',
                                                                    backgroundColor: dotColor,
                                                                    border: '3px solid #FFFFFF',
                                                                    boxShadow: '0 0 0 1px #CBD5E1'
                                                                }} />

                                                                <div style={{
                                                                    backgroundColor: '#FFFFFF',
                                                                    border: `1px solid ${isFirstSaleOrder ? '#DDD6FE' : isBankLien ? '#FDE68A' : '#E2E8F0'}`,
                                                                    borderRadius: '8px',
                                                                    padding: '0.85rem 1rem',
                                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                                                                        <span style={{
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 800,
                                                                            padding: '2px 8px',
                                                                            borderRadius: '4px',
                                                                            backgroundColor: eventBadgeBg,
                                                                            color: eventBadgeColor,
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: '0.04em'
                                                                        }}>
                                                                            {eventTitle}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                                                            {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Recorded'}
                                                                        </span>
                                                                    </div>

                                                                    {/* Event Details Content */}
                                                                    {isSale && event.data && (
                                                                        <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '6px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                                <span>Seller: <code style={{ fontSize: '0.75rem', color: '#0F172A' }}>{shortenWallet(event.data.seller)}</code></span>
                                                                                <ArrowRight size={12} style={{ color: '#94A3B8' }} />
                                                                                <span>Buyer: <code style={{ fontSize: '0.75rem', color: '#0F172A' }}>{shortenWallet(event.data.buyer)}</code></span>
                                                                                {event.data.price && (
                                                                                    <span style={{ fontWeight: 700, color: '#059669', marginLeft: 'auto' }}>
                                                                                        ₹{Number(event.data.price).toLocaleString('en-IN')}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px' }}>
                                                                                Status: <strong style={{ textTransform: 'capitalize' }}>{event.data.status || 'completed'}</strong>
                                                                                {event.data.fundsBlocked && <span style={{ marginLeft: '8px', color: '#D97706', fontWeight: 600 }}>• ASBA Bank Funds Blocked</span>}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {isBankLien && event.data && (
                                                                        <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '6px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                                                <span>Bank Ref: <strong style={{ fontFamily: 'monospace' }}>{event.data.bankReferenceId || 'Pending Ref'}</strong></span>
                                                                                <span>Held Amount: <strong style={{ color: '#D97706' }}>₹{Number(event.data.blockAmount || 0).toLocaleString('en-IN')}</strong></span>
                                                                                <span>Buyer: <code style={{ fontSize: '0.75rem' }}>{shortenWallet(event.data.buyerWallet)}</code></span>
                                                                            </div>
                                                                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px' }}>
                                                                                Lien Status: <strong>{event.data.bankConfirmed ? 'Confirmed by Bank' : event.data.status}</strong>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {isReg && event.data && (
                                                                        <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '6px' }}>
                                                                            <span>Survey #{event.data.surveyNumber} originally registered to <code style={{ fontSize: '0.75rem' }}>{shortenWallet(event.data.ownerWallet)}</code> in {event.data.district}, {event.data.state}.</span>
                                                                        </div>
                                                                    )}

                                                                    {isFreeze && event.data && (
                                                                        <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '6px' }}>
                                                                            <div>Reason: <strong>{event.data.reason || 'Pending judicial adjudication'}</strong></div>
                                                                            {event.data.caseNumber && <div>Court Case: <strong style={{ fontFamily: 'monospace' }}>{event.data.caseNumber}</strong></div>}
                                                                        </div>
                                                                    )}

                                                                    {isReversal && event.data && (
                                                                        <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '6px' }}>
                                                                            <div>Title restored to previous owner: <code style={{ fontSize: '0.75rem' }}>{shortenWallet(event.data.previousOwner)}</code></div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 4: Deeds & Attached Survey Documents */}
                                        <div style={{
                                            backgroundColor: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '12px',
                                            padding: '1.25rem',
                                            marginBottom: '1.5rem'
                                        }}>
                                            <div style={{
                                                fontSize: '0.78rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                                color: '#1E3A8A',
                                                marginBottom: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <FileText size={15} />
                                                4. Registered Deeds & IPFS Survey Documents
                                            </div>

                                            {docs.length === 0 ? (
                                                <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic', padding: '0.5rem 0' }}>
                                                    {prop.documentHash ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <FileCheck size={16} style={{ color: '#2563EB' }} />
                                                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>Primary Title Deed</span>
                                                            </div>
                                                            <a
                                                                href={`https://ipfs.io/ipfs/${prop.documentHash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    color: '#2563EB',
                                                                    textDecoration: 'none',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: '#EFF6FF',
                                                                    border: '1px solid #BFDBFE'
                                                                }}
                                                            >
                                                                View on IPFS <ExternalLink size={11} />
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        'No additional deed files attached to this registry entry.'
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                                                    {docs.map((doc, dIdx) => (
                                                        <div
                                                            key={dIdx}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '10px 12px',
                                                                backgroundColor: '#FFFFFF',
                                                                border: '1px solid #E2E8F0',
                                                                borderRadius: '8px'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                <Paperclip size={15} style={{ color: '#2563EB', flexShrink: 0 }} />
                                                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {doc.documentType || doc.name || `Document #${dIdx + 1}`}
                                                                </span>
                                                            </div>

                                                            {doc.ipfsHash && (
                                                                <a
                                                                    href={`https://ipfs.io/ipfs/${doc.ipfsHash}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 700,
                                                                        color: '#2563EB',
                                                                        textDecoration: 'none',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: '#EFF6FF',
                                                                        border: '1px solid #BFDBFE'
                                                                    }}
                                                                >
                                                                    View <ExternalLink size={11} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* SECTION 5: Officer Directives & Action Bar */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: '1rem',
                                            padding: '1rem 1.25rem',
                                            backgroundColor: '#F1F5F9',
                                            borderRadius: '10px',
                                            border: '1px solid #E2E8F0'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#475569' }}>
                                                <ShieldCheck size={18} style={{ color: '#059669', flexShrink: 0 }} />
                                                <span>
                                                    <strong>Officer Directive:</strong> Verify original land records, first sale deeds, and bank lien holds before finalizing approval or applying dispute injunctions.
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {prop.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => openActionModal(prop.id, 'approve')}
                                                            disabled={isActionExecuting}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '8px 16px',
                                                                borderRadius: '8px',
                                                                backgroundColor: '#047857',
                                                                color: '#FFFFFF',
                                                                fontSize: '0.82rem',
                                                                fontWeight: 700,
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <CheckCircle2 size={15} />
                                                            Approve Title
                                                        </button>
                                                        <button
                                                            onClick={() => openActionModal(prop.id, 'reject')}
                                                            disabled={isActionExecuting}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '8px 16px',
                                                                borderRadius: '8px',
                                                                backgroundColor: '#FFFFFF',
                                                                color: '#DC2626',
                                                                border: '1px solid #FECACA',
                                                                fontSize: '0.82rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <XCircle size={15} />
                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                                {prop.status === 'active' && (
                                                    <button
                                                        onClick={() => openActionModal(prop.id, prop.encumbranceStatus ? 'unencumber' : 'encumber')}
                                                        disabled={isActionExecuting}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '8px 16px',
                                                            borderRadius: '8px',
                                                            backgroundColor: prop.encumbranceStatus ? '#ECFDF5' : '#FEF3C7',
                                                            color: prop.encumbranceStatus ? '#047857' : '#B45309',
                                                            border: prop.encumbranceStatus ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                                                            fontSize: '0.82rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {prop.encumbranceStatus ? <Unlock size={15} /> : <Lock size={15} />}
                                                        {prop.encumbranceStatus ? 'Unlock Property' : 'Lock Property (Lien / Dispute)'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Action Reasoning Dialog Modal */}
            {actionModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '520px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '14px',
                        padding: '1.75rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        border: '1px solid #CBD5E1'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                            {actionModal.type === 'approve' ? (
                                <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                                    <CheckCircle2 size={20} />
                                </div>
                            ) : actionModal.type === 'encumber' || actionModal.type === 'unencumber' ? (
                                <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                                    <Lock size={20} />
                                </div>
                            ) : (
                                <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                                    <XCircle size={20} />
                                </div>
                            )}

                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                    {actionModal.type === 'approve' ? 'Approve Property Title' : actionModal.type === 'encumber' ? 'Lock Property (Dispute Freeze)' : actionModal.type === 'unencumber' ? 'Unlock Property' : 'Reject Property Registration'}
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0, marginTop: '2px' }}>
                                    {actionModal.type === 'approve' ? 'Confirm that this property, owner records, and survey deeds have been officially verified.' : actionModal.type === 'encumber' ? 'Lock this property to freeze sales or transfers while under dispute or investigation.' : actionModal.type === 'unencumber' ? 'Remove dispute lock and restore active registered status.' : 'Specify reason for rejecting this registration.'}
                                </p>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                {actionModal.type === 'approve' ? 'Officer Notes (Optional):' : 'Reason for Decision:'}
                            </label>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder={actionModal.type === 'approve' ? 'E.g. Survey numbers, chain of title, first sale order, and boundary coordinates verified with official land records.' : 'Enter reason...'}
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#F8FAFC',
                                    fontSize: '0.875rem',
                                    color: '#0F172A',
                                    outline: 'none',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {actionModal.error && (
                            <div style={{
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#991B1B',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                marginBottom: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <AlertCircle size={15} />
                                {actionModal.error}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setActionModal({ isOpen: false, type: '', propId: null, error: '' })}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    color: '#334155',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={confirmAction}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    backgroundColor: actionModal.type === 'approve' ? '#047857' : actionModal.type === 'encumber' || actionModal.type === 'unencumber' ? '#D97706' : '#DC2626',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                            >
                                {actionModal.type === 'approve' ? 'Approve Title' : actionModal.type === 'encumber' ? 'Lock Property' : actionModal.type === 'unencumber' ? 'Unlock Property' : 'Reject Property'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyVerification;
