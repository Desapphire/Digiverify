import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { bankService } from '../../services/bank.service';
import { useAuth } from '../../context/AuthContext';
import {
    Loader2, CheckCircle2, AlertTriangle, Landmark, DollarSign,
    Hash, ArrowRight, ArrowLeft, XCircle, Info, CreditCard, ShieldCheck
} from 'lucide-react';
import './PropertyPages.css';

const FundBlocking = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [sale, setSale] = useState(null);
    const [fundBlocks, setFundBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [bankRefId, setBankRefId] = useState('');
    const [step, setStep] = useState('input'); // 'input' | 'success'

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const saleRes = await saleService.getSaleById(id);
                const saleData = saleRes.data?.data;
                setSale(saleData);

                try {
                    const fbRes = await bankService.getFundBlocks(id);
                    setFundBlocks(fbRes.data?.data || []);
                    const confirmedBlock = (fbRes.data?.data || []).find(fb => fb.status === 'blocked');
                    if (confirmedBlock || saleData?.fundsBlocked) {
                        setStep('success');
                    }
                } catch (e) {
                    // non-critical
                }
            } catch (err) {
                console.error('Failed to load sale', err);
                setError('Transaction not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleRequestAndConfirm = async () => {
        try {
            setSubmitting(true);
            setError('');

            const requestRes = await bankService.requestFundBlock({
                transactionId: id,
                blockAmount: sale.salePrice,
            });

            const fundBlockId = requestRes.data?.data?.id;
            if (!fundBlockId) {
                throw new Error('Fund block initiation failed.');
            }

            await bankService.confirmFundBlock(fundBlockId, bankRefId.trim());
            setStep('success');

            const updatedSale = await saleService.getSaleById(id);
            setSale(updatedSale.data?.data);
        } catch (err) {
            console.error('Fund blocking failed', err);
            setError(err.response?.data?.message || err.message || 'Failed to confirm fund block.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 style={{ width: '3rem', height: '3rem', color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>Loading Escrow Payment Details...</p>
                </div>
            </div>
        );
    }

    if (error && !sale) {
        return (
            <div className="property-container container-sm" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <XCircle size={54} style={{ color: '#DC2626', margin: '0 auto 1.5rem' }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Transaction Not Found</h2>
                <p style={{ color: '#64748B', marginBottom: '2rem' }}>{error}</p>
                <button className="gov-btn gov-btn-primary" onClick={() => navigate('/transactions')}>
                    Back to Transactions
                </button>
            </div>
        );
    }

    return (
        <div className="property-container container-sm">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <button className="back-button" onClick={() => navigate(`/sale/${id}/review`)}>
                        <ArrowLeft size={16} /> Back to Agreement Review
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h1 className="page-title" style={{ margin: 0 }}>
                            Lock Payment in Escrow
                        </h1>
                        <span className="gov-badge" style={{ '--badge-bg': '#EFF6FF', '--badge-color': '#1E40AF', fontFamily: 'JetBrains Mono' }}>
                            TX #{sale?.id?.slice(0, 8)?.toUpperCase()}
                        </span>
                    </div>
                    <p className="page-subtitle" style={{ marginTop: '0.35rem' }}>
                        Follow simple netbanking steps to safely reserve the payment.
                    </p>
                </div>
            </div>

            {/* Amount Callout */}
            <div className="gov-card" style={{ marginBottom: '1.5rem', background: '#F8FAFC' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Amount to Lock
                        </span>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#1E40AF', margin: '0.25rem 0 0' }}>
                            ₹ {sale?.salePrice?.toLocaleString('en-IN')}
                        </h2>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Payment Mode
                        </span>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', margin: '0.25rem 0 0' }}>
                            INR (Indian Rupee)
                        </p>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Safe Escrow Bank Hold</span>
                    </div>
                </div>
            </div>

            {/* Input State */}
            {step === 'input' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Bank Instructions Card */}
                    <div className="gov-card" style={{ borderLeft: '4px solid #1E40AF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <Info size={18} style={{ color: '#1E40AF' }} />
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                Simple Netbanking Steps
                            </h3>
                        </div>
                        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, margin: 0 }}>
                            <li style={{ marginBottom: '0.35rem' }}>Log in to your net banking portal or visit your bank branch.</li>
                            <li style={{ marginBottom: '0.35rem' }}>Go to the <strong>ASBA / Escrow / Funds Hold</strong> section.</li>
                            <li style={{ marginBottom: '0.35rem' }}>Enter the exact sale amount: <strong>₹{sale?.salePrice?.toLocaleString('en-IN')}</strong></li>
                            <li style={{ marginBottom: '0.35rem' }}>Enter this Reference Code: <strong style={{ fontFamily: 'JetBrains Mono', color: '#1E40AF' }}>DVRFY-TX-{sale?.id?.slice(0, 8)?.toUpperCase()}</strong></li>
                            <li>Copy the <strong>Bank Reference / UTR Number</strong> from your bank and enter it below.</li>
                        </ol>
                    </div>

                    {/* Confirmation Input Form */}
                    <div className="gov-card">
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <CreditCard size={18} /> Enter Bank Reference Number
                            </h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <Hash size={13} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                Bank Reference / UTR Number *
                            </label>
                            <input
                                type="text"
                                className="gov-input mono"
                                placeholder="e.g. UTR123456789 or BRN-2026-98124991"
                                value={bankRefId}
                                onChange={(e) => setBankRefId(e.target.value)}
                                style={{ fontSize: '1rem' }}
                            />
                        </div>

                        {error && (
                            <div className="alert-message error" style={{ marginBottom: '1.25rem' }}>
                                <AlertTriangle size={16} /> {error}
                            </div>
                        )}

                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.6rem' }}>
                            <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ color: '#92400E', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                                Your funds stay safely in your bank account on hold until the government authority approves the property transfer.
                            </p>
                        </div>

                        <button
                            className="gov-btn gov-btn-primary w-full"
                            disabled={submitting || !bankRefId.trim()}
                            onClick={handleRequestAndConfirm}
                            style={{ padding: '0.9rem', fontSize: '0.95rem' }}
                        >
                            {submitting ? (
                                <><Loader2 size={18} className="animate-spin" /> Confirming Payment Hold...</>
                            ) : (
                                <><Landmark size={18} /> Confirm Locked Payment</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Success State */}
            {step === 'success' && (
                <div className="certificate-container" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: '#ECFDF5',
                        border: '2px solid #059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: '#059669'
                    }}>
                        <ShieldCheck size={40} />
                    </div>

                    <span className="gov-badge" style={{ '--badge-bg': '#ECFDF5', '--badge-color': '#059669', '--badge-border': '#A7F3D0', marginBottom: '1rem' }}>
                        Payment Safely Locked
                    </span>

                    <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                        Payment Locked in Escrow
                    </h2>
                    <p style={{ color: '#475569', maxWidth: '480px', margin: '0 auto 2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        Your payment is now safely locked in escrow. The agreement has been sent to the land authority for approval.
                    </p>

                    <div className="gov-data-grid" style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
                        <div className="gov-data-item">
                            <span className="label">Locked Amount</span>
                            <span className="value" style={{ fontWeight: 800 }}>₹{sale?.salePrice?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="gov-data-item">
                            <span className="label">Escrow Status</span>
                            <span className="value" style={{ color: '#059669' }}>CONFIRMED & LOCKED</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="gov-btn" onClick={() => navigate('/transactions')}>
                            My Transactions
                        </button>
                        <button className="gov-btn gov-btn-primary" onClick={() => navigate(`/sale/${id}/review`)}>
                            View Agreement Details <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundBlocking;
