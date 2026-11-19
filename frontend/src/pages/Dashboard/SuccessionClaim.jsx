import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { successionService } from '../../services/succession.service';
import { propertyService } from '../../services/property.service';
import {
    Users, Plus, Trash2, CheckCircle2, AlertCircle, FileText,
    ShieldAlert, ArrowRight, ExternalLink, RefreshCw, Clock, Scale
} from 'lucide-react';
import './PropertyPages.css';

const SuccessionClaim = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('claims'); // 'claims' | 'file'
    const [claims, setClaims] = useState([]);
    const [myProperties, setMyProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [lastTxHash, setLastTxHash] = useState('');

    // Form state for filing
    const [formData, setFormData] = useState({
        property_id: '',
        deceased_owner_wallet: '',
        death_certificate_hash: '',
        probate_order_hash: '',
        court_bench: 'High Court Revenue Bench',
        primary_successor_wallet: '',
        heirs: [
            {
                heir_wallet: user?.wallet_address || '',
                full_name: user?.full_name || '',
                relation_to_deceased: 'Legal Heir',
                share_percentage_bps: 10000,
                kyc_hash: 'QmMockLegalHeirKyc',
            },
        ],
    });

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const [claimsRes, propsRes] = await Promise.all([
                successionService.getClaims(),
                propertyService.getMyProperties().catch(() => ({ data: { data: [] } })),
            ]);
            setClaims(claimsRes.data?.data || []);
            setMyProperties(propsRes.data?.data || []);
        } catch (err) {
            console.error('Error loading succession data:', err);
            setError(err.response?.data?.error || 'Failed to load succession claims');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Calculate total share bps
    const totalBps = formData.heirs.reduce((acc, h) => acc + (Number(h.share_percentage_bps) || 0), 0);
    const isShareBalanced = totalBps === 10000;

    const handleAddHeir = () => {
        setFormData({
            ...formData,
            heirs: [
                ...formData.heirs,
                {
                    heir_wallet: '',
                    full_name: '',
                    relation_to_deceased: 'Legal Heir',
                    share_percentage_bps: 0,
                    kyc_hash: 'QmMockLegalHeirKyc',
                },
            ],
        });
    };

    const handleRemoveHeir = (index) => {
        if (formData.heirs.length <= 1) return;
        const updated = formData.heirs.filter((_, idx) => idx !== index);
        setFormData({ ...formData, heirs: updated });
    };

    const handleHeirChange = (index, field, value) => {
        const updated = [...formData.heirs];
        updated[index][field] = value;
        setFormData({ ...formData, heirs: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLastTxHash('');

        if (!formData.property_id) {
            setError('Please select a valid registered property.');
            return;
        }

        if (!formData.deceased_owner_wallet || !/^0x[a-fA-F0-9]{40}$/.test(formData.deceased_owner_wallet)) {
            setError('Please enter a valid Ethereum wallet address for the deceased owner.');
            return;
        }

        if (!formData.death_certificate_hash) {
            setError('Official Death Certificate IPFS hash or document reference is required.');
            return;
        }

        if (!isShareBalanced) {
            setError(`Partition shares must sum exactly to 100.00% (10,000 BPS). Current total: ${(totalBps / 100).toFixed(2)}%`);
            return;
        }

        // Validate each heir wallet
        for (let i = 0; i < formData.heirs.length; i++) {
            const h = formData.heirs[i];
            if (!/^0x[a-fA-F0-9]{40}$/.test(h.heir_wallet)) {
                setError(`Heir #${i + 1} wallet address is invalid.`);
                return;
            }
            if (!h.full_name) {
                setError(`Heir #${i + 1} full legal name is required.`);
                return;
            }
        }

        try {
            setSubmitting(true);
            const res = await successionService.fileClaim({
                ...formData,
                heirs: formData.heirs.map(h => ({
                    ...h,
                    share_percentage_bps: Number(h.share_percentage_bps),
                })),
            });

            setSuccessMsg('Succession claim successfully filed and recorded on-chain!');
            if (res.data?.data?.txHash) {
                setLastTxHash(res.data.data.txHash);
            }
            await loadData();
            setActiveTab('claims');
        } catch (err) {
            console.error('Failed to submit succession claim:', err);
            setError(err.response?.data?.error || err.message || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return { bg: '#EFF6FF', color: '#1E40AF', text: 'Approved (Pending Partition)' };
            case 'executed':
                return { bg: '#F0FDF4', color: '#166534', text: 'Partition Executed & Transferred' };
            case 'rejected':
                return { bg: '#FEF2F2', color: '#991B1B', text: 'Claim Rejected' };
            default:
                return { bg: '#FEFCE8', color: '#854D0E', text: 'Under Revenue Review' };
        }
    };

    return (
        <div className="property-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                            <Scale size={22} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                Legal Heir Succession & Partition Registry
                            </h1>
                            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                                Smart Contract 6: <code style={{ fontFamily: 'JetBrains Mono', color: '#2563EB' }}>InheritanceSuccession.sol</code>
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={loadData}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button
                        onClick={() => setActiveTab(activeTab === 'file' ? 'claims' : 'file')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                    >
                        {activeTab === 'file' ? 'View Claims' : <><Plus size={16} /> File New Succession Claim</>}
                    </button>
                </div>
            </div>

            {/* Notification messages */}
            {error && (
                <div style={{ padding: '1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {successMsg && (
                <div style={{ padding: '1rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#166534', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CheckCircle2 size={20} />
                        <span style={{ fontWeight: 700 }}>{successMsg}</span>
                    </div>
                    {lastTxHash && (
                        <a
                            href={`https://sepolia.etherscan.io/tx/${lastTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#166534', textDecoration: 'underline', fontSize: '0.85rem' }}
                        >
                            View transaction on Sepolia Etherscan <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', marginBottom: '1.5rem', gap: '1rem' }}>
                <button
                    onClick={() => setActiveTab('claims')}
                    style={{
                        padding: '0.75rem 1.25rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'claims' ? '3px solid #2563EB' : '3px solid transparent',
                        fontWeight: 700,
                        color: activeTab === 'claims' ? '#2563EB' : '#64748B',
                        cursor: 'pointer',
                    }}
                >
                    Succession Cases ({claims.length})
                </button>
                <button
                    onClick={() => setActiveTab('file')}
                    style={{
                        padding: '0.75rem 1.25rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'file' ? '3px solid #2563EB' : '3px solid transparent',
                        fontWeight: 700,
                        color: activeTab === 'file' ? '#2563EB' : '#64748B',
                        cursor: 'pointer',
                    }}
                >
                    File New Claim
                </button>
            </div>

            {/* Tab Content: Claims List */}
            {activeTab === 'claims' && (
                <div>
                    {claims.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                            <Scale size={48} style={{ color: '#94A3B8', margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>No Succession Claims Found</h3>
                            <p style={{ color: '#64748B', maxWidth: '500px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                                There are no active legal heir succession or partition claims filed for your wallet or properties.
                            </p>
                            <button
                                onClick={() => setActiveTab('file')}
                                style={{ padding: '0.6rem 1.25rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                            >
                                File a Legal Heir Claim
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {claims.map((claim) => {
                                const badge = getStatusBadge(claim.status);
                                return (
                                    <div
                                        key={claim.id}
                                        style={{
                                            background: '#FFFFFF',
                                            borderRadius: '12px',
                                            border: '1px solid #E2E8F0',
                                            padding: '1.5rem',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A' }}>
                                                        {claim.property_code}
                                                    </span>
                                                    <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: badge.bg, color: badge.color, fontWeight: 700 }}>
                                                        {badge.text}
                                                    </span>
                                                    {claim.on_chain_case_id && (
                                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#F1F5F9', color: '#475569', fontFamily: 'JetBrains Mono' }}>
                                                            On-Chain Case #{claim.on_chain_case_id}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                                                    Survey Number: <strong>{claim.survey_number}</strong> • District: <strong>{claim.district || 'Revenue Division'}</strong> • State: <strong>{claim.state || 'National Registry'}</strong>
                                                </p>
                                            </div>

                                            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748B' }}>
                                                <div>Filed: {new Date(claim.created_at).toLocaleDateString()}</div>
                                                {claim.executed_at && (
                                                    <div style={{ color: '#166534', fontWeight: 600 }}>
                                                        Executed: {new Date(claim.executed_at).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Deceased & Court Order info */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem', background: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Deceased Owner</span>
                                                <div style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', color: '#0F172A', wordBreak: 'break-all' }}>
                                                    {claim.deceased_owner_wallet}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Death Certificate IPFS CID</span>
                                                <div style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', color: '#2563EB', wordBreak: 'break-all' }}>
                                                    {claim.death_certificate_hash}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Court Bench / Order</span>
                                                <div style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>
                                                    {claim.court_bench || 'Revenue Court'} {claim.probate_order_hash ? `(${claim.probate_order_hash.slice(0, 10)}...)` : ''}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Primary Successor Title</span>
                                                <div style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', color: '#0F172A', wordBreak: 'break-all' }}>
                                                    {claim.primary_successor_wallet}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Legal Heirs Partition Table */}
                                        <div>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Users size={16} /> Legal Heirs Partition Deed ({claim.heirs?.length || 0} designated heirs)
                                            </h4>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr style={{ background: '#F1F5F9', textAlign: 'left', color: '#475569' }}>
                                                            <th style={{ padding: '0.5rem 0.75rem' }}>Full Legal Name</th>
                                                            <th style={{ padding: '0.5rem 0.75rem' }}>Relationship</th>
                                                            <th style={{ padding: '0.5rem 0.75rem' }}>Wallet Address</th>
                                                            <th style={{ padding: '0.5rem 0.75rem' }}>Partition Share</th>
                                                            <th style={{ padding: '0.5rem 0.75rem' }}>Verification</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {claim.heirs?.map((h, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{h.full_name}</td>
                                                                <td style={{ padding: '0.5rem 0.75rem', color: '#64748B' }}>{h.relation_to_deceased}</td>
                                                                <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                                                                    {h.heir_wallet}
                                                                </td>
                                                                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#2563EB' }}>
                                                                    {(Number(h.share_percentage_bps) / 100).toFixed(2)}% ({h.share_percentage_bps} bps)
                                                                </td>
                                                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                                                    <span style={{ color: '#166534', background: '#F0FDF4', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                                        Attested
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {claim.officer_remarks && (
                                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#FEFCE8', borderLeft: '4px solid #CA8A04', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                <strong>Officer Remarks:</strong> {claim.officer_remarks}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab Content: File New Claim Form */}
            {activeTab === 'file' && (
                <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '2rem' }}>
                    <form onSubmit={handleSubmit}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '1.5rem' }}>
                            File Deceased Property Legal Heir Succession Claim
                        </h2>

                        {/* Property & Deceased Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Select Registered Property *
                                </label>
                                <select
                                    value={formData.property_id}
                                    onChange={(e) => {
                                        const propId = e.target.value;
                                        const p = myProperties.find(x => x.id === propId);
                                        const owner = p?.ownerWallet || p?.owner_wallet || formData.deceased_owner_wallet;
                                        setFormData({
                                            ...formData,
                                            property_id: propId,
                                            deceased_owner_wallet: owner,
                                        });
                                    }}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF' }}
                                    required
                                >
                                    <option value="">-- Choose Land Parcel --</option>
                                    {myProperties.map((p) => {
                                        const code = p.propertyCode || p.property_code || 'Parcel';
                                        const survey = p.surveyNumber || p.survey_number || 'N/A';
                                        const dist = p.district || 'State Division';
                                        return (
                                            <option key={p.id} value={p.id}>
                                                {code} - Survey #{survey} ({dist})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Deceased Owner Wallet Address *
                                </label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={formData.deceased_owner_wallet}
                                    onChange={(e) => setFormData({ ...formData, deceased_owner_wallet: e.target.value })}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Official Death Certificate IPFS CID / Hash *
                                </label>
                                <input
                                    type="text"
                                    placeholder="QmDeathCert..."
                                    value={formData.death_certificate_hash}
                                    onChange={(e) => setFormData({ ...formData, death_certificate_hash: e.target.value })}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Probate / Succession Court Order CID (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="QmProbateOrder..."
                                    value={formData.probate_order_hash}
                                    onChange={(e) => setFormData({ ...formData, probate_order_hash: e.target.value })}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Competent Court Bench / Revenue Office
                                </label>
                                <input
                                    type="text"
                                    value={formData.court_bench}
                                    onChange={(e) => setFormData({ ...formData, court_bench: e.target.value })}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                                    Primary Successor / Nominee Wallet
                                </label>
                                <input
                                    type="text"
                                    placeholder="0x... (Will receive title deed NFT if single partition)"
                                    value={formData.primary_successor_wallet}
                                    onChange={(e) => setFormData({ ...formData, primary_successor_wallet: e.target.value })}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>

                        {/* Legal Heirs Partition Deed Manager */}
                        <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', background: '#F8FAFC' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Legal Heirs & Title Share Allocation
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                                        Total share must add up to 100.00% (10,000 basis points).
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{
                                        fontWeight: 800,
                                        fontSize: '0.9rem',
                                        padding: '0.3rem 0.75rem',
                                        borderRadius: '6px',
                                        background: isShareBalanced ? '#DCFCE7' : '#FEE2E2',
                                        color: isShareBalanced ? '#15803D' : '#B91C1C',
                                    }}>
                                        Total: {(totalBps / 100).toFixed(2)}% / 100% ({totalBps} bps)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleAddHeir}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.8rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                    >
                                        <Plus size={14} /> Add Heir
                                    </button>
                                </div>
                            </div>

                            {formData.heirs.map((heir, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) 40px',
                                        gap: '0.75rem',
                                        alignItems: 'center',
                                        background: '#FFFFFF',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid #E2E8F0',
                                        marginBottom: '0.75rem',
                                    }}
                                >
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Heir Wallet *</label>
                                        <input
                                            type="text"
                                            placeholder="0x..."
                                            value={heir.heir_wallet}
                                            onChange={(e) => handleHeirChange(idx, 'heir_wallet', e.target.value)}
                                            style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Full Name *</label>
                                        <input
                                            type="text"
                                            placeholder="Legal Name"
                                            value={heir.full_name}
                                            onChange={(e) => handleHeirChange(idx, 'full_name', e.target.value)}
                                            style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Relationship *</label>
                                        <select
                                            value={heir.relation_to_deceased}
                                            onChange={(e) => handleHeirChange(idx, 'relation_to_deceased', e.target.value)}
                                            style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}
                                        >
                                            <option value="Legal Heir">Legal Heir</option>
                                            <option value="Son">Son</option>
                                            <option value="Daughter">Daughter</option>
                                            <option value="Spouse">Spouse</option>
                                            <option value="Mother">Mother</option>
                                            <option value="Father">Father</option>
                                            <option value="Brother">Brother</option>
                                            <option value="Sister">Sister</option>
                                            <option value="Nominee">Nominee</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Share (Basis Points: 5000 = 50%) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10000"
                                            value={heir.share_percentage_bps}
                                            onChange={(e) => handleHeirChange(idx, 'share_percentage_bps', e.target.value)}
                                            style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 700 }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveHeir(idx)}
                                            disabled={formData.heirs.length <= 1}
                                            style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.25rem' }}
                                            title="Remove heir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Submit Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('claims')}
                                style={{ padding: '0.75rem 1.5rem', background: '#F1F5F9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !isShareBalanced}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 2rem',
                                    background: isShareBalanced ? '#2563EB' : '#94A3B8',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: isShareBalanced ? 'pointer' : 'not-allowed',
                                    fontWeight: 700,
                                }}
                            >
                                {submitting ? 'Submitting to Blockchain...' : <><CheckCircle2 size={18} /> Record Succession Claim</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default SuccessionClaim;
