import React, { useState, useEffect } from 'react';
import { successionService } from '../../services/succession.service';
import {
    Scale, CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink,
    Users, ShieldCheck, FileText, ArrowRight, Gavel, Clock
} from 'lucide-react';
import '../Dashboard/PropertyPages.css';

const SuccessionApproval = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [remarksMap, setRemarksMap] = useState({});
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [lastTxHash, setLastTxHash] = useState('');

    const loadClaims = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await successionService.getClaims();
            setClaims(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load succession claims:', err);
            setError(err.response?.data?.error || 'Failed to fetch succession cases');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClaims();
    }, []);

    const handleApprove = async (claimId) => {
        try {
            setActionLoadingId(claimId);
            setError('');
            setSuccessMsg('');
            setLastTxHash('');
            const remarks = remarksMap[claimId] || 'Verified and approved by Revenue Authority';

            const res = await successionService.approveClaim(claimId, remarks);
            setSuccessMsg('Succession claim approved on-chain! Now ready for partition execution.');
            if (res.data?.data?.txHash) {
                setLastTxHash(res.data.data.txHash);
            }
            await loadClaims();
        } catch (err) {
            console.error('Approval failed:', err);
            setError(err.response?.data?.error || err.message || 'Approval failed');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleExecute = async (claimId) => {
        try {
            setActionLoadingId(claimId);
            setError('');
            setSuccessMsg('');
            setLastTxHash('');

            const res = await successionService.executeClaim(claimId);
            setSuccessMsg('Succession partition executed on-chain! Ownership title has been reassigned.');
            if (res.data?.data?.txHash) {
                setLastTxHash(res.data.data.txHash);
            }
            await loadClaims();
        } catch (err) {
            console.error('Execution failed:', err);
            setError(err.response?.data?.error || err.message || 'Execution failed');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleReject = async (claimId) => {
        try {
            setActionLoadingId(claimId);
            setError('');
            setSuccessMsg('');
            const remarks = remarksMap[claimId] || 'Contested or invalid documentation';

            await successionService.rejectClaim(claimId, remarks);
            setSuccessMsg('Succession claim rejected.');
            await loadClaims();
        } catch (err) {
            console.error('Rejection failed:', err);
            setError(err.response?.data?.error || err.message || 'Rejection failed');
        } finally {
            setActionLoadingId(null);
        }
    };

    const filteredClaims = claims.filter((c) => {
        if (filterStatus === 'all') return true;
        return c.status === filterStatus;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'approved':
                return { bg: '#EFF6FF', color: '#1E40AF', text: 'Approved (Pending Execution)' };
            case 'executed':
                return { bg: '#F0FDF4', color: '#166534', text: 'Partition Executed' };
            case 'rejected':
                return { bg: '#FEF2F2', color: '#991B1B', text: 'Rejected' };
            default:
                return { bg: '#FEFCE8', color: '#854D0E', text: 'Pending Revenue Review' };
        }
    };

    return (
        <div className="admin-container" style={{ maxWidth: '1300px', margin: '0 auto', padding: '1.5rem' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                            <Scale size={22} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                Legal Heir Succession & Partition Review
                            </h1>
                            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                                Revenue Officer Workbench • Smart Contract 6 (<code style={{ fontFamily: 'JetBrains Mono', color: '#2563EB' }}>InheritanceSuccession.sol</code>)
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={loadClaims}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Queue
                </button>
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

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: `All Cases (${claims.length})` },
                    { key: 'pending_review', label: `Pending Review (${claims.filter(c => c.status === 'pending_review').length})` },
                    { key: 'approved', label: `Approved / Ready (${claims.filter(c => c.status === 'approved').length})` },
                    { key: 'executed', label: `Executed (${claims.filter(c => c.status === 'executed').length})` },
                    { key: 'rejected', label: `Rejected (${claims.filter(c => c.status === 'rejected').length})` },
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilterStatus(f.key)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: filterStatus === f.key ? '#2563EB' : '#E2E8F0',
                            background: filterStatus === f.key ? '#2563EB' : '#FFFFFF',
                            color: filterStatus === f.key ? '#FFFFFF' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Claims Queue */}
            {filteredClaims.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <Scale size={48} style={{ color: '#94A3B8', margin: '0 auto 1rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>No Claims In Queue</h3>
                    <p style={{ color: '#64748B', maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem' }}>
                        No legal heir succession claims match the selected filter.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {filteredClaims.map((claim) => {
                        const statusBadge = getStatusStyle(claim.status);
                        return (
                            <div
                                key={claim.id}
                                style={{
                                    background: '#FFFFFF',
                                    borderRadius: '12px',
                                    border: '1px solid #E2E8F0',
                                    padding: '1.75rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0F172A' }}>
                                                {claim.property_code}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: statusBadge.bg, color: statusBadge.color, fontWeight: 700 }}>
                                                {statusBadge.text}
                                            </span>
                                            {claim.on_chain_case_id && (
                                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#F1F5F9', color: '#475569', fontFamily: 'JetBrains Mono' }}>
                                                    On-Chain Case #{claim.on_chain_case_id}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                                            Survey #{claim.survey_number} • District: {claim.district} • State: {claim.state} • Area: {claim.area_sqft || 0} sq.ft
                                        </p>
                                    </div>

                                    <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748B' }}>
                                        <div>Filed: {new Date(claim.created_at).toLocaleString()}</div>
                                        {claim.executed_at && (
                                            <div style={{ color: '#166534', fontWeight: 700 }}>
                                                Partition Executed: {new Date(claim.executed_at).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Deceased & Legal Documents Info */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.25rem', background: '#F8FAFC', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                                    <div>
                                        <span style={{ color: '#64748B', fontWeight: 700, fontSize: '0.75rem' }}>DECEASED OWNER</span>
                                        <div style={{ fontFamily: 'JetBrains Mono', color: '#0F172A', wordBreak: 'break-all' }}>
                                            {claim.deceased_owner_wallet}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748B', fontWeight: 700, fontSize: '0.75rem' }}>DEATH CERTIFICATE CID</span>
                                        <div style={{ fontFamily: 'JetBrains Mono', color: '#2563EB', wordBreak: 'break-all' }}>
                                            {claim.death_certificate_hash}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748B', fontWeight: 700, fontSize: '0.75rem' }}>COURT BENCH / ORDER</span>
                                        <div style={{ color: '#0F172A', fontWeight: 600 }}>
                                            {claim.court_bench || 'Revenue Court'} {claim.probate_order_hash ? `(${claim.probate_order_hash})` : ''}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748B', fontWeight: 700, fontSize: '0.75rem' }}>PRIMARY SUCCESSOR REASSIGNMENT</span>
                                        <div style={{ fontFamily: 'JetBrains Mono', color: '#0F172A', wordBreak: 'break-all' }}>
                                            {claim.primary_successor_wallet || 'Partitioned across heirs'}
                                        </div>
                                    </div>
                                </div>

                                {/* Legal Heirs Table */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={16} /> Legal Heirs & Partition Shares ({claim.heirs?.length || 0} heirs)
                                    </h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: '#F1F5F9', textAlign: 'left', color: '#475569' }}>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>Full Legal Name</th>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>Relationship</th>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>Wallet Address</th>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>Partition Share</th>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
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

                                {/* Officer Remarks Input & Actions */}
                                {claim.status !== 'executed' && claim.status !== 'rejected' && (
                                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                                Revenue Officer Inspection Remarks
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Enter verification comments or reason..."
                                                value={remarksMap[claim.id] || ''}
                                                onChange={(e) => setRemarksMap({ ...remarksMap, [claim.id]: e.target.value })}
                                                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => handleReject(claim.id)}
                                                disabled={actionLoadingId === claim.id}
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                            >
                                                <XCircle size={16} /> Reject Claim
                                            </button>

                                            {claim.status === 'pending_review' && (
                                                <button
                                                    onClick={() => handleApprove(claim.id)}
                                                    disabled={actionLoadingId === claim.id}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.5rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                                >
                                                    {actionLoadingId === claim.id ? 'Approving On-Chain...' : <><ShieldCheck size={16} /> Approve Claim On-Chain</>}
                                                </button>
                                            )}

                                            {claim.status === 'approved' && (
                                                <button
                                                    onClick={() => handleExecute(claim.id)}
                                                    disabled={actionLoadingId === claim.id}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.5rem', background: '#166534', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                                                >
                                                    {actionLoadingId === claim.id ? 'Executing Partition...' : <><Gavel size={16} /> Execute Partition & Reassign Title</>}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

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
    );
};

export default SuccessionApproval;
