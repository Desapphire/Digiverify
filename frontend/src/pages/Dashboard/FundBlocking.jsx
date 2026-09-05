import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { bankService } from '../../services/bank.service';
import { useAuth } from '../../context/AuthContext';
import { TopNavbar } from '../../components/TopNavbar';
import {
    Loader2, CheckCircle2, AlertTriangle, Landmark, DollarSign,
    Hash, ArrowRight, XCircle, Info, CreditCard, ShieldCheck, ArrowLeft
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
                    // No fund blocks yet
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
                transactionId: id,
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
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, color: '#94A3B8', fontSize: '0.88rem' }}>Loading ASBA Escrow...</p>
                </div>
            </div>
        );
    }

    if (error && !sale) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }}>
                <TopNavbar showLogo={true} />
                <div style={{ padding: '4rem 2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                    <XCircle size={48} style={{ color: '#EF4444', margin: '0 auto 1rem' }} />
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Transaction Not Found</h2>
                    <p style={{ color: '#94A3B8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</p>
                    <button className="btn-cyan-outline" onClick={() => navigate('/transactions')}>
                        Back to Transactions
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            <TopNavbar 
                title="ASBA Escrow Fund Block" 
                subtitle={`Transaction #${sale?.id?.slice(0, 8)} • Certified Banking Partner Lock`}
                showLogo={false} 
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2.5rem 2rem', maxWidth: '750px', margin: '0 auto' }}>
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <button onClick={() => navigate(-1)} className="btn-dark-pill">
                        <ArrowLeft size={14} /> Back
                    </button>
                </div>

                {/* Sale Price Display */}
                <div 
                    className="digi-card p-6" 
                    style={{ 
                        background: '#0F172A', 
                        border: '1px solid #1E293B', 
                        borderRadius: '16px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1.5rem',
                        marginBottom: '1.5rem'
                    }}
                >
                    <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <DollarSign size={13} /> Amount to Lock
                        </span>
                        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', margin: '4px 0 0 0' }}>
                            ₹{sale?.salePrice?.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Currency & Model</span>
                        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: '4px 0 0 0' }}>INR (ASBA Escrow)</p>
                        <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: '2px 0 0 0' }}>Held in your account until authority approval</p>
                    </div>
                </div>

                {/* Bank Instructions */}
                {step === 'input' && (
                    <>
                        <div 
                            className="digi-card p-6" 
                            style={{ 
                                background: '#0F172A', 
                                border: '1px solid #1E293B', 
                                borderRadius: '16px',
                                marginBottom: '1.5rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <Info size={16} style={{ color: '#38BDF8' }} />
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>Bank Instructions (ASBA Model)</h3>
                            </div>
                            <ol style={{ paddingLeft: '1.25rem', color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.8, margin: 0 }}>
                                <li>Log in to your registered bank's <strong>NetBanking portal</strong> or mobile application.</li>
                                <li>Navigate to the <strong>Fund Blocking / ASBA</strong> section.</li>
                                <li>Enter the exact escrow amount: <strong style={{ color: '#F8FAFC' }}>₹{sale?.salePrice?.toLocaleString('en-IN')}</strong></li>
                                <li>Enter the system transaction reference: <strong style={{ fontFamily: 'JetBrains Mono', color: '#38BDF8' }}>DVRFY-TX-{sale?.id?.slice(0, 8)}</strong></li>
                                <li>Complete the verification with your bank OTP and copy the <strong>Bank Reference ID</strong>.</li>
                            </ol>
                        </div>

                        {/* Bank Reference Input */}
                        <div 
                            className="digi-card p-6" 
                            style={{ 
                                background: '#0F172A', 
                                border: '1px solid #1E293B', 
                                borderRadius: '16px' 
                            }}
                        >
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', margin: 0, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <CreditCard size={16} style={{ color: '#0284C7' }} /> Confirm ASBA Fund Block
                            </h3>
                            <p style={{ color: '#94A3B8', fontSize: '0.82rem', margin: 0, marginBottom: '1.25rem' }}>
                                Provide the reference ID generated by your bank after the ASBA lock is active.
                            </p>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: '#94A3B8' }}>
                                    <Hash size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                    Bank Reference ID *
                                </label>
                                <input
                                    className="input-premium"
                                    type="text"
                                    placeholder="e.g. BRN-2026-90428"
                                    value={bankRefId}
                                    onChange={(e) => setBankRefId(e.target.value)}
                                    style={{ width: '100%', fontSize: '0.95rem', fontFamily: 'JetBrains Mono' }}
                                />
                            </div>

                            {error && (
                                <div style={{
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                                    borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem',
                                    fontSize: '0.82rem', color: '#EF4444',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                                }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <div style={{
                                background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)',
                                borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
                                display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
                            }}>
                                <AlertTriangle size={15} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ color: '#94A3B8', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>
                                    Ensure the blocked amount matches <strong>₹{sale?.salePrice?.toLocaleString('en-IN')}</strong> exactly. Mismatches will require manual audit.
                                </p>
                            </div>

                            <button
                                className="btn-cyan-glow"
                                disabled={submitting || !bankRefId.trim()}
                                onClick={handleRequestAndConfirm}
                                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                            >
                                {submitting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Verifying Bank Escrow...</>
                                ) : (
                                    <><Landmark size={16} /> Confirm Fund Block</>
                                )}
                            </button>
                        </div>
                    </>
                )}

                {/* Success State */}
                {step === 'success' && (
                    <div 
                        className="digi-card p-8 text-center" 
                        style={{ 
                            background: '#0F172A', 
                            border: '1px solid #1E293B', 
                            borderRadius: '16px' 
                        }}
                    >
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1.25rem',
                            background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10B981',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ShieldCheck size={36} style={{ color: '#10B981' }} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                            ASBA Escrow Active
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                            Funds are safely blocked in your account under ASBA protocol.
                        </p>
                        <p style={{ color: '#94A3B8', fontSize: '0.82rem', marginBottom: '1.75rem' }}>
                            The agreement is now in the queue for final surveyor verification and land authority sign-off.
                        </p>

                        <div style={{
                            background: '#0B0F19', border: '1px solid #1E293B', borderRadius: '10px', padding: '1rem 1.25rem',
                            marginBottom: '1.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Amount Blocked</span>
                                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10B981', margin: '2px 0 0 0' }}>₹{sale?.salePrice?.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Status</span>
                                <div style={{ marginTop: '2px' }}>
                                    <span className="badge-active-green">ASBA Active</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button className="btn-dark-pill" onClick={() => navigate('/transactions')}>
                                View Transactions
                            </button>
                            <button className="btn-cyan-glow" onClick={() => navigate(`/sale/${id}/review`)}>
                                View Agreement Details <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FundBlocking;
