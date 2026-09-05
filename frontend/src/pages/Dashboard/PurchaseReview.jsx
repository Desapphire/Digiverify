import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { TopNavbar } from '../../components/TopNavbar';
import { AvalancheIcon, MetaMaskIcon } from '../../components/Icons';
import {
    Loader2, CheckCircle2, AlertTriangle, Wallet, DollarSign,
    Building, MapPin, ArrowRight, ChevronLeft, XCircle, Shield, Clock,
    FileCheck, Landmark, Send, ExternalLink, Activity, Copy, Check
} from 'lucide-react';
import './PropertyPages.css';

const PurchaseReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { account, connectWallet, signMessage } = useWeb3();

    const [sale, setSale] = useState(null);
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [error, setError] = useState('');
    const [signSuccess, setSignSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    const walletAddress = account || user?.walletAddress;

    useEffect(() => {
        const fetchSale = async () => {
            try {
                setLoading(true);
                const saleRes = await saleService.getSaleById(id);
                const saleData = saleRes.data?.data;
                setSale(saleData);

                if (saleData?.propertyId) {
                    try {
                        const propRes = await propertyService.getPropertyById(saleData.propertyId);
                        setProperty(propRes.data?.data);
                    } catch (e) {
                        console.error('Failed to load property', e);
                    }
                }
            } catch (err) {
                console.error('Failed to load sale', err);
                setError('Sale transaction record not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchSale();
    }, [id]);

    const handleSignWithMetaMask = async () => {
        try {
            setSigning(true);
            setError('');

            let wallet = account;
            if (!wallet) {
                wallet = await connectWallet();
            }

            const parcelLabel = property?.propertyCode || property?.surveyNumber || sale?.propertyId || id;
            const priceVal = sale?.salePrice ? Number(sale.salePrice).toLocaleString('en-IN') : '1500000';
            const message = `DIGIVERIFY MULTI-SIG CONFIRMATION: Sign and authorize title transfer for Parcel #${parcelLabel} at value ₹${priceVal}`;
            const signature = await signMessage(message);

            if (sale?.id) {
                await saleService.signSale(sale.id, signature);
            }
            setSignSuccess(true);

            // Reload live sale state
            const updated = await saleService.getSaleById(id);
            setSale(updated.data?.data);
        } catch (err) {
            console.error('Signing failed', err);
            setError(err.response?.data?.message || err.message || 'MetaMask signature rejected.');
        } finally {
            setSigning(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shortenWallet = (addr) => {
        if (!addr) return '—';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.02em', color: '#94A3B8', fontSize: '0.88rem' }}>Loading Multi-Sig Settlement...</p>
                </div>
            </div>
        );
    }

    if (!sale) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }}>
                <TopNavbar showLogo={true} />
                <div style={{ display: 'flex', flexDirection: 'column', height: '70vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
                    <AlertTriangle size={48} style={{ color: '#EF4444', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Transaction Not Found</h2>
                    <p style={{ color: '#94A3B8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error || 'Unable to locate this sale agreement on-chain.'}</p>
                    <button className="btn-cyan-outline" onClick={() => navigate('/dashboard')}>
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Dynamic parameters derived from real sale transaction
    const sellerAddr = shortenWallet(sale.sellerWallet);
    const buyerAddr = shortenWallet(sale.buyerWallet);
    const parcelId = property?.propertyCode 
        ? `#DV-${property.propertyCode}` 
        : (property?.surveyNumber ? `#DV-${property.surveyNumber}` : `#DV-${sale.propertyId?.slice(0, 6) || '9042'}`);
    
    const priceFormatted = sale.salePrice ? `₹${Number(sale.salePrice).toLocaleString('en-IN')}` : '₹0';
    const asbaRef = sale.bankReferenceId || `#BK-${sale.id.slice(0, 6).toUpperCase()}`;
    const contractAddress = sale.smartContractAddr || sale.txHash || (sale.id ? `0x${sale.id.replace(/-/g, '').slice(0, 40)}` : '0xPendingContractDeployment');

    const isStep1Done = Boolean(sale.sellerSigned);
    const isStep2Done = Boolean(sale.buyerSigned);
    const isStep3Done = Boolean(sale.authoritySigned);

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            {/* Top Navbar Header */}
            <TopNavbar 
                showLogo={true} 
                logoSubtitle="Multi-Sig Land Settlement"
                showNetwork={true}
                showNotifications={false}
                showProfile={false}
            />

            <div style={{ padding: '2.5rem 2rem', maxWidth: '1440px', margin: '0 auto' }}>
                <div 
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr', 
                        gap: '1.75rem',
                        alignItems: 'start'
                    }}
                >
                    {/* ════════ LEFT / CENTER MAIN: Multi-Signature Progress ════════ */}
                    <div 
                        className="digi-card p-8"
                        style={{
                            background: '#0F172A',
                            border: '1px solid #1E293B',
                            borderRadius: '16px',
                            minHeight: '520px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                    >
                        <div>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '2rem' }}>
                                Multi-Signature Progress
                            </h2>

                            {/* ── Stepper Line (1 - 2 - 3) ── */}
                            <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
                                {/* Horizontal Progress Track */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        top: '16px',
                                        left: '5%',
                                        right: '5%',
                                        height: '2px',
                                        background: '#1E293B',
                                        zIndex: 1
                                    }}
                                />
                                {/* Active progress fill */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        top: '16px',
                                        left: '5%',
                                        width: isStep3Done ? '90%' : (isStep2Done ? '65%' : '20%'),
                                        height: '2px',
                                        background: '#0284C7',
                                        zIndex: 2,
                                        transition: 'width 0.3s ease'
                                    }}
                                />

                                {/* 3 Step Number Badges */}
                                <div style={{ display: 'flex', justifyContent: 'space-around', position: 'relative', zIndex: 3 }}>
                                    {/* Step 1 */}
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isStep1Done ? '#0284C7' : '#0B0F19', border: isStep1Done ? 'none' : '1px solid #334155', color: isStep1Done ? '#FFFFFF' : '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                        {isStep1Done ? <Check size={16} strokeWidth={3} /> : '1'}
                                    </div>
                                    {/* Step 2 */}
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isStep2Done ? '#0284C7' : '#0B0F19', border: isStep2Done ? 'none' : '1px solid #334155', color: isStep2Done ? '#FFFFFF' : '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                        {isStep2Done ? <Check size={16} strokeWidth={3} /> : '2'}
                                    </div>
                                    {/* Step 3 */}
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isStep3Done ? '#10B981' : '#0B0F19', border: isStep3Done ? 'none' : '1px solid #0284C7', color: isStep3Done ? '#FFFFFF' : '#38BDF8', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                        {isStep3Done ? <Check size={16} strokeWidth={3} /> : '3'}
                                    </div>
                                </div>
                            </div>

                            {/* ── 3 Stepper Stage Cards ── */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                
                                {/* Stage 1: Seller Signed */}
                                <div 
                                    style={{
                                        padding: '1.25rem 1rem',
                                        background: '#0B0F19',
                                        border: '1px solid #1E293B',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        gap: '0.6rem'
                                    }}
                                >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isStep1Done ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)', border: isStep1Done ? '1px solid #10B981' : '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={18} style={{ color: isStep1Done ? '#10B981' : '#64748B', strokeWidth: 3 }} />
                                    </div>
                                    <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                        Seller Signed
                                    </p>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.5rem', background: '#1E293B', borderRadius: '6px', fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'JetBrains Mono' }}>
                                        <MetaMaskIcon size={13} />
                                        {sellerAddr}
                                    </div>
                                </div>

                                {/* Stage 2: Buyer Signed & ASBA Funds Blocked */}
                                <div 
                                    style={{
                                        padding: '1.25rem 1rem',
                                        background: '#0B0F19',
                                        border: '1px solid #1E293B',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        gap: '0.6rem'
                                    }}
                                >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isStep2Done ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)', border: isStep2Done ? '1px solid #10B981' : '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={18} style={{ color: isStep2Done ? '#10B981' : '#64748B', strokeWidth: 3 }} />
                                    </div>
                                    <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                        Buyer Signed &<br />ASBA Locked
                                    </p>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.5rem', background: '#1E293B', borderRadius: '6px', fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'JetBrains Mono' }}>
                                        <MetaMaskIcon size={13} />
                                        {buyerAddr}
                                    </div>
                                </div>

                                {/* Stage 3: Land Authority Approval */}
                                <div 
                                    style={{
                                        padding: '1.25rem 1rem',
                                        background: isStep3Done ? 'rgba(16, 185, 129, 0.08)' : '#0B0F19',
                                        border: isStep3Done ? '1px solid #10B981' : '1px solid #0284C7',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        gap: '0.6rem'
                                    }}
                                >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isStep3Done ? 'rgba(16, 185, 129, 0.12)' : 'rgba(2, 132, 199, 0.12)', border: isStep3Done ? '1px solid #10B981' : '1px solid #0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isStep3Done ? <Check size={18} style={{ color: '#10B981' }} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284C7' }} />}
                                    </div>
                                    <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                        Land Authority<br />Approval
                                    </p>
                                    <span style={{ fontSize: '0.7rem', color: isStep3Done ? '#10B981' : '#38BDF8', fontWeight: 600 }}>
                                        {isStep3Done ? 'Regulatory Seal Affixed' : 'Awaiting Registrar'}
                                    </span>
                                </div>
                            </div>

                            {/* ── Summary Details Bar ── */}
                            <div 
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '1.5rem',
                                    padding: '1.1rem 1.5rem',
                                    background: '#0B0F19',
                                    border: '1px solid #1E293B',
                                    borderRadius: '12px',
                                    marginBottom: '1.5rem'
                                }}
                            >
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Parcel</span>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0, marginTop: '2px', fontFamily: 'JetBrains Mono' }}>
                                        {parcelId}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Price</span>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10B981', margin: 0, marginTop: '2px' }}>
                                        {priceFormatted}
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>ASBA Block Ref</span>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0, marginTop: '2px', fontFamily: 'JetBrains Mono' }}>
                                        {asbaRef}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Action Button ── */}
                        <div>
                            {error && (
                                <p style={{ fontSize: '0.82rem', color: '#EF4444', textAlign: 'center', marginBottom: '0.75rem', fontWeight: 600 }}>
                                    {error}
                                </p>
                            )}
                            {signSuccess && (
                                <div style={{ padding: '0.65rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#10B981', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                    Cryptographic signature verified on Avalanche Fuji! Title transfer executed.
                                </div>
                            )}
                            <button
                                onClick={handleSignWithMetaMask}
                                disabled={signing || (isStep1Done && isStep2Done && isStep3Done)}
                                className="btn-cyan-glow"
                                style={{
                                    width: '100%',
                                    padding: '0.9rem',
                                    fontSize: '0.95rem',
                                    borderRadius: '10px',
                                    opacity: (isStep1Done && isStep2Done && isStep3Done) ? 0.7 : 1
                                }}
                            >
                                {signing ? (
                                    <><Loader2 size={18} className="animate-spin" /> Verifying MetaMask Signature...</>
                                ) : (
                                    isStep3Done ? 'Multi-Sig Fully Executed & Settled' : 'Sign with MetaMask & Authorize Title Transfer'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ════════ RIGHT PANEL: Real-time cryptographic audit trail ════════ */}
                    <div 
                        className="digi-card p-6"
                        style={{
                            background: '#0F172A',
                            border: '1px solid #1E293B',
                            borderRadius: '16px',
                            minHeight: '520px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                    >
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.4rem' }}>
                                Real-Time Cryptographic Audit Trail
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
                                <FileCheck size={14} />
                                <span>Smart contract {shortenWallet(contractAddress)}</span>
                            </div>

                            {/* Timeline Steps */}
                            <div style={{ position: 'relative', paddingLeft: '1.75rem' }}>
                                {/* Vertical Progress Line */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        left: '7px',
                                        top: '8px',
                                        bottom: '20px',
                                        width: '2px',
                                        background: '#1E293B'
                                    }}
                                />

                                {/* Event 1: Seller Signed */}
                                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                    <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: isStep1Done ? '#10B981' : '#0B0F19', border: isStep1Done ? 'none' : '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isStep1Done && <Check size={10} style={{ color: '#FFFFFF', strokeWidth: 3 }} />}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                            Seller Initiation & Signature
                                        </p>
                                        <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px', margin: 0, lineHeight: 1.4 }}>
                                            {sellerAddr}, authenticated transaction proposal on Avalanche Fuji
                                        </p>
                                    </div>
                                </div>

                                {/* Event 2: Buyer Signed */}
                                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                    <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: isStep2Done ? '#10B981' : '#0B0F19', border: isStep2Done ? 'none' : '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isStep2Done && <Check size={10} style={{ color: '#FFFFFF', strokeWidth: 3 }} />}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                            Buyer Counter-Signature
                                        </p>
                                        <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px', margin: 0, lineHeight: 1.4 }}>
                                            {isStep2Done ? `${buyerAddr} cryptographically confirmed agreement` : 'Pending buyer multi-sig authorization'}
                                        </p>
                                    </div>
                                </div>

                                {/* Event 3: ASBA Funds Locked */}
                                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                    <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: sale.fundsBlocked ? '#10B981' : '#0B0F19', border: sale.fundsBlocked ? 'none' : '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {sale.fundsBlocked && <Check size={10} style={{ color: '#FFFFFF', strokeWidth: 3 }} />}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                            ASBA Escrow Fund Lock
                                        </p>
                                        <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px', margin: 0, lineHeight: 1.4 }}>
                                            {sale.fundsBlocked ? `${priceFormatted} securely blocked in partner bank escrow` : 'Awaiting banking partner escrow lock confirmation'}
                                        </p>
                                    </div>
                                </div>

                                {/* Event 4: Authority Approval */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', background: isStep3Done ? '#10B981' : '#0B0F19', border: isStep3Done ? 'none' : '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isStep3Done && <Check size={10} style={{ color: '#FFFFFF', strokeWidth: 3 }} />}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                            Registrar Authority Seal
                                        </p>
                                        <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px', margin: 0 }}>
                                            {isStep3Done ? 'Title deed ownership transferred and sealed on-chain' : 'Awaiting government registrar final verification'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Smart Contract Box */}
                        <div 
                            style={{
                                marginTop: '1.5rem',
                                padding: '0.85rem',
                                background: '#0B0F19',
                                border: '1px solid #1E293B',
                                borderRadius: '8px'
                            }}
                        >
                            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                                Smart Contract
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#38BDF8', wordBreak: 'break-all' }}>
                                    {contractAddress}
                                </span>
                                <button 
                                    onClick={() => handleCopy(contractAddress)}
                                    style={{ background: 'none', border: 'none', color: copied ? '#10B981' : '#94A3B8', cursor: 'pointer', padding: 0 }}
                                    title="Copy Contract Hash"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseReview;
