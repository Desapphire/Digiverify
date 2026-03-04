import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { bankService } from '../../services/bank.service';
import { useAuth } from '../../context/AuthContext';
import {
    Loader2, CheckCircle2, AlertTriangle, Landmark, DollarSign,
    Hash, ArrowRight, XCircle, Info, CreditCard, ShieldCheck
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
    const [step, setStep] = useState('input'); // 'input' | 'confirming' | 'success'

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const saleRes = await saleService.getSaleById(id);
                const saleData = saleRes.data?.data;
                setSale(saleData);

                // Fetch existing fund blocks
                try {
                    const fbRes = await bankService.getFundBlocks(id);
                    setFundBlocks(fbRes.data?.data || []);
                    // If funds already blocked, go to success
                    const confirmedBlock = (fbRes.data?.data || []).find(fb => fb.status === 'blocked');
                    if (confirmedBlock || saleData?.fundsBlocked) {
                        setStep('success');
                    }
                } catch (e) {
                    // No fund blocks yet, that's fine
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

            // Step 1: Request fund block
            const requestRes = await bankService.requestFundBlock({
                transactionId: parseInt(id),
                blockAmount: sale.salePrice,
            });

            const fundBlockId = requestRes.data?.data?.id;

            if (!fundBlockId) {
                throw new Error('Fund block creation failed.');
            }

            // Step 2: Confirm with bank reference
            await bankService.confirmFundBlock(fundBlockId, bankRefId);

            setStep('success');

            // Refresh sale
            const updatedSale = await saleService.getSaleById(id);
            setSale(updatedSale.data?.data);
        } catch (err) {
            console.error('Fund blocking failed', err);
            setError(err.response?.data?.message || err.message || 'Failed to block funds.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: 'hsl(255,85%,65%)' }} className="animate-spin" />
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Fund Block...</p>
                </div>
            </div>
        );
    }

    if (error && !sale) {
        return (
            <div className="dashboard-container container-sm">
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <XCircle size={48} style={{ color: 'hsl(var(--color-danger))', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Transaction Not Found</h2>
                    <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/transactions')}>Back to Transactions</button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container" style={{ maxWidth: '750px' }}>
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                        Fund <span className="text-gradient">Blocking</span>
                    </h1>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                        TX #{sale?.id}
                    </span>
                </div>
                <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                    ASBA-style fund blocking for secure escrow transactions
                </p>
            </div>

            {/* Sale Price Display */}
            <div className="info-box info-box-grid" style={{ marginBottom: '1.25rem' }}>
                <div>
                    <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <DollarSign size={12} /> Amount to Block
                    </p>
                    <p style={{ fontSize: '2rem', fontWeight: 800 }} className="text-gradient">
                        ₹{sale?.salePrice?.toLocaleString('en-IN')}
                    </p>
                </div>
                <div>
                    <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Currency</p>
                    <p style={{ fontSize: '2rem', fontWeight: 800 }}>INR</p>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>Indian Rupee</p>
                </div>
            </div>

            {/* Bank Instructions */}
            {step === 'input' && (
                <>
                    <div className="instruction-card" style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <Info size={16} style={{ color: 'hsl(217,91%,60%)' }} />
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Bank Instructions (ASBA Model)</h3>
                        </div>
                        <ol>
                            <li>Log in to your registered bank's <strong>net banking portal</strong> or mobile app.</li>
                            <li>Navigate to <strong>Fund Blocking / ASBA</strong> section.</li>
                            <li>Enter the <strong>exact sale amount</strong> shown above: <strong>₹{sale?.salePrice?.toLocaleString('en-IN')}</strong></li>
                            <li>Use reference: <strong style={{ fontFamily: 'monospace', color: 'hsl(255,85%,65%)' }}>DVRFY-TX-{sale?.id}</strong></li>
                            <li>Complete the blocking process and note the <strong>Bank Reference ID</strong>.</li>
                            <li>Enter the Bank Reference ID below to confirm the block.</li>
                        </ol>
                    </div>

                    {/* Bank Reference Input */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CreditCard size={16} /> Confirm Fund Block
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                            Enter the Bank Reference ID received from your bank after blocking the funds.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'hsl(var(--color-text-secondary))' }}>
                                <Hash size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                Bank Reference ID
                            </label>
                            <input
                                className="input-premium"
                                type="text"
                                placeholder="e.g. BRN-2026-XXXXXXXX"
                                value={bankRefId}
                                onChange={(e) => setBankRefId(e.target.value)}
                                style={{ fontSize: '1rem', fontFamily: 'monospace' }}
                            />
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
                                borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem',
                                fontSize: '0.8rem', color: 'hsl(var(--color-danger))',
                                display: 'flex', alignItems: 'center', gap: '0.4rem'
                            }}>
                                <AlertTriangle size={14} /> {error}
                            </div>
                        )}

                        {/* Warning */}
                        <div style={{
                            background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)',
                            borderRadius: '10px', padding: '0.75rem', marginBottom: '1.25rem',
                            display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
                        }}>
                            <AlertTriangle size={14} style={{ color: 'hsl(38,92%,50%)', flexShrink: 0, marginTop: '2px' }} />
                            <p className="text-muted" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                                Ensure you have blocked <strong>exactly ₹{sale?.salePrice?.toLocaleString('en-IN')}</strong> in your bank account.
                                Incorrect amounts will delay the transaction.
                            </p>
                        </div>

                        <button
                            className="btn btn-primary btn-glow w-full"
                            disabled={submitting || !bankRefId.trim()}
                            onClick={handleRequestAndConfirm}
                            style={{ padding: '0.875rem', fontSize: '0.95rem' }}
                        >
                            {submitting ? (
                                <><Loader2 size={16} className="animate-spin" /> Processing...</>
                            ) : (
                                <><Landmark size={16} /> Confirm Fund Block</>
                            )}
                        </button>
                    </div>
                </>
            )}

            {/* Success State */}
            {step === 'success' && (
                <div className="glass-panel-elevated" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div className="scale-in" style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto',
                            background: 'rgba(34,197,94,0.1)', border: '2px solid hsl(142,71%,45%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ShieldCheck size={40} style={{ color: 'hsl(142,71%,45%)' }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                        Funds <span style={{ color: 'hsl(142,71%,45%)' }}>Blocked!</span>
                    </h2>
                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                        The funds have been successfully blocked in your bank account.
                    </p>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '2rem' }}>
                        The transaction is now pending authority approval before ownership can be transferred.
                    </p>

                    <div style={{
                        background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem',
                        marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left'
                    }}>
                        <div>
                            <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Amount Blocked</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{sale?.salePrice?.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Status</p>
                            <span className="badge badge-success">BLOCKED</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={() => navigate('/transactions')}>
                            My Transactions
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate(`/sale/${id}/review`)}>
                            View Sale Details <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundBlocking;
