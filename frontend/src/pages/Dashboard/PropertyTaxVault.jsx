import React, { useState, useEffect } from 'react';
import { taxService } from '../../services/tax.service';
import { useAuth } from '../../context/AuthContext';
import {
    Landmark, CheckCircle2, AlertTriangle, ShieldCheck, Download,
    FileText, RefreshCw, CreditCard, ChevronRight, ExternalLink, Calendar, Receipt
} from 'lucide-react';
import './PropertyPages.css';

const PropertyTaxVault = () => {
    const { user } = useAuth();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState(null);
    const [selectedNoc, setSelectedNoc] = useState(null);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [lastTxHash, setLastTxHash] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await taxService.getPropertiesWithTaxes();
            setProperties(res.data?.data || []);
        } catch (err) {
            console.error('Error fetching property taxes:', err);
            setError(err.response?.data?.error || 'Failed to load property tax records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handlePayTax = async (assessmentId, propertyCode) => {
        try {
            setPayingId(assessmentId);
            setError('');
            setSuccessMsg('');
            setLastTxHash('');

            const res = await taxService.payTax(assessmentId);
            setSuccessMsg(`Property tax settled successfully for ${propertyCode}! 1-Year Cryptographic NOC has been issued on-chain.`);
            if (res.data?.data?.txHash) {
                setLastTxHash(res.data.data.txHash);
            }
            await loadData();
        } catch (err) {
            console.error('Tax payment failed:', err);
            setError(err.response?.data?.error || err.message || 'Payment processing failed');
        } finally {
            setPayingId(null);
        }
    };

    // Calculate aggregated metrics
    const totalProperties = properties.length;
    const totalOutstanding = properties.reduce((sum, p) => sum + (Number(p.totalDueOutstanding) || 0), 0);
    const totalActiveNocs = properties.filter((p) => p.activeNoc).length;

    return (
        <div className="property-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                            <Landmark size={22} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                Municipal Property Tax & NOC Vault
                            </h1>
                            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                                Smart Contract 7: <code style={{ fontFamily: 'JetBrains Mono', color: '#2563EB' }}>PropertyTaxVault.sol</code>
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={loadData}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Ledger
                </button>
            </div>

            {/* Notification messages */}
            {error && (
                <div style={{ padding: '1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertTriangle size={20} />
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
                            View NOC transaction on Sepolia Etherscan <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Properties Assessed</span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginTop: '0.25rem' }}>
                        {totalProperties}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>In your citizen portfolio</span>
                </div>

                <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Outstanding Dues</span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: totalOutstanding > 0 ? '#DC2626' : '#166534', marginTop: '0.25rem' }}>
                        ₹ {totalOutstanding.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: totalOutstanding > 0 ? '#DC2626' : '#166534' }}>
                        {totalOutstanding > 0 ? 'Payment required for NOC' : 'All municipal taxes cleared'}
                    </span>
                </div>

                <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Active 1-Year NOCs</span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2563EB', marginTop: '0.25rem' }}>
                        {totalActiveNocs}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Cryptographic clearance tokens</span>
                </div>

                <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Vault Status</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <ShieldCheck size={24} style={{ color: totalOutstanding === 0 ? '#166534' : '#EAB308' }} />
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                            {totalOutstanding === 0 ? 'Compliant & Clear' : 'Arrears Pending'}
                        </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Municipal ledger synced</span>
                </div>
            </div>

            {/* Properties List */}
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem' }}>
                Property Tax Assessments & Clearance Certificates
            </h2>

            {properties.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <Landmark size={48} style={{ color: '#94A3B8', margin: '0 auto 1rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>No Registered Properties Found</h3>
                    <p style={{ color: '#64748B', maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem' }}>
                        Register your land parcels to view annual municipal tax assessments and download tax clearance certificates.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {properties.map((prop) => (
                        <div
                            key={prop.id}
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A' }}>
                                            {prop.propertyCode || prop.property_code}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#EFF6FF', color: '#1E40AF', fontFamily: 'JetBrains Mono' }}>
                                            Token ID #{prop.nftTokenId || prop.nft_token_id || '1'}
                                        </span>
                                        {prop.activeNoc ? (
                                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#F0FDF4', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <ShieldCheck size={14} /> Active 1-Year NOC
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#FEF2F2', color: '#991B1B', fontWeight: 700 }}>
                                                No Valid NOC
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                                        Survey #{prop.surveyNumber || prop.survey_number} • District: {prop.district || 'Revenue Division'} • Area: {prop.areaSqft || prop.area_sqft || 0} sq.ft
                                    </p>
                                </div>

                                {prop.activeNoc && (
                                    <button
                                        onClick={() => setSelectedNoc({ ...prop.activeNoc, property: prop })}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.9rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, color: '#166534', fontSize: '0.85rem' }}
                                    >
                                        <FileText size={15} /> View Cryptographic NOC
                                    </button>
                                )}
                            </div>

                            {/* Assessments for this property */}
                            {prop.taxes && prop.taxes.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#475569' }}>
                                                <th style={{ padding: '0.6rem 0.75rem' }}>Financial Year</th>
                                                <th style={{ padding: '0.6rem 0.75rem' }}>Base Tax</th>
                                                <th style={{ padding: '0.6rem 0.75rem' }}>Cess (5%)</th>
                                                <th style={{ padding: '0.6rem 0.75rem' }}>Penalties</th>
                                                <th style={{ padding: '0.6rem 0.75rem' }}>Total Due</th>
                                                <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                                                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prop.taxes.map((tax) => {
                                                const fyString = `FY ${String(tax.financial_year).slice(0, 4)}-${String(tax.financial_year).slice(6)}`;
                                                return (
                                                    <tr key={tax.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#0F172A' }}>
                                                            {fyString}
                                                        </td>
                                                        <td style={{ padding: '0.6rem 0.75rem' }}>₹ {Number(tax.base_tax_amount).toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: '0.6rem 0.75rem' }}>₹ {Number(tax.cess_amount || 0).toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: '0.6rem 0.75rem', color: Number(tax.penalty_amount) > 0 ? '#DC2626' : '#64748B' }}>
                                                            ₹ {Number(tax.penalty_amount || 0).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, color: '#0F172A' }}>
                                                            ₹ {Number(tax.total_due).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '0.6rem 0.75rem' }}>
                                                            {tax.is_cleared ? (
                                                                <span style={{ background: '#F0FDF4', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                    Cleared on {new Date(tax.paid_at).toLocaleDateString()}
                                                                </span>
                                                            ) : (
                                                                <span style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                    Payment Due
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                                                            {tax.is_cleared ? (
                                                                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Settled</span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handlePayTax(tax.id, prop.propertyCode || prop.property_code)}
                                                                    disabled={payingId === tax.id}
                                                                    style={{
                                                                        padding: '0.45rem 0.9rem',
                                                                        background: '#2563EB',
                                                                        color: '#FFFFFF',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.8rem',
                                                                        cursor: payingId === tax.id ? 'not-allowed' : 'pointer',
                                                                    }}
                                                                >
                                                                    {payingId === tax.id ? 'Settling...' : 'Pay Tax & Get NOC'}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', color: '#64748B', fontSize: '0.85rem' }}>
                                    No tax assessments currently registered for this property by the Municipal Officer.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Cryptographic 1-Year NOC Modal */}
            {selectedNoc && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '1rem',
                    }}
                    onClick={() => setSelectedNoc(null)}
                >
                    <div
                        style={{
                            background: '#FFFFFF',
                            borderRadius: '16px',
                            maxWidth: '650px',
                            width: '100%',
                            padding: '2.5rem',
                            border: '3px double #2563EB',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                            position: 'relative',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Gov Emblem & Title */}
                        <div style={{ textAlign: 'center', borderBottom: '2px solid #0F172A', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '48px', height: '48px', margin: '0 auto 0.5rem', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                                <ShieldCheck size={32} />
                            </div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Government of India • DigiVerify Land Registry
                            </h2>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
                                Official Municipal Property Tax Clearance Certificate (NOC)
                            </p>
                        </div>

                        {/* Certificate Body */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                            <div>
                                <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>PROPERTY CODE</span>
                                <div style={{ fontWeight: 800, color: '#0F172A' }}>{selectedNoc.property?.property_code}</div>
                            </div>
                            <div>
                                <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>NFT TOKEN ID</span>
                                <div style={{ fontWeight: 800, color: '#0F172A' }}>Token #{selectedNoc.property?.nft_token_id || selectedNoc.token_id || '1'}</div>
                            </div>
                            <div>
                                <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>SURVEY NUMBER</span>
                                <div style={{ fontWeight: 800, color: '#0F172A' }}>{selectedNoc.property?.survey_number}</div>
                            </div>
                            <div>
                                <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>FINANCIAL YEAR</span>
                                <div style={{ fontWeight: 800, color: '#0F172A' }}>FY {String(selectedNoc.financial_year).slice(0, 4)}-{String(selectedNoc.financial_year).slice(6)}</div>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>VALIDITY PERIOD</span>
                                <div style={{ fontWeight: 800, color: '#166534' }}>
                                    Valid until {new Date(selectedNoc.valid_until).toLocaleDateString()} (1 Year On-Chain Clearance)
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>CRYPTOGRAPHIC CERTIFICATE HASH</span>
                                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#2563EB', wordBreak: 'break-all', background: '#F8FAFC', padding: '0.5rem', borderRadius: '6px' }}>
                                    {selectedNoc.certificate_hash}
                                </div>
                            </div>
                        </div>

                        {/* Footer Seal */}
                        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                <div>Secured by Smart Contract 7</div>
                                <code>PropertyTaxVault (Sepolia)</code>
                            </div>
                            <button
                                onClick={() => window.print()}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                <Download size={15} /> Print / Save PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyTaxVault;
