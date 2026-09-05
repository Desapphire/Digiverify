import React, { useEffect, useState } from 'react';
import { userService } from '../../services/user.service';
import { useAuth } from '../../context/AuthContext';
import { TopNavbar } from '../../components/TopNavbar';
import {
    Bell, ShieldCheck, FileCheck, XCircle, Landmark,
    AlertTriangle, Send, Loader2, ArrowRight, Copy, CheckCircle2, X, RefreshCw
} from 'lucide-react';
import './PropertyPages.css';

const Notifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await userService.getNotifications();
            setNotifications(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load notifications', err);
            setError('Could not load notifications. ' + (err.response?.data?.message || err.message || ''));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    // Format utility for timestamps
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper to map audit events to UI representation — synced with backend AUDIT_ACTIONS
    const getNotificationDetails = (log) => {
        const { action_type, entity_id, entity_type, metadata } = log;

        switch (action_type) {
            case 'USER_REGISTERED':
                return {
                    icon: ShieldCheck, color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',
                    title: 'Account Created',
                    description: 'Your DigiVerify identity was successfully registered.',
                };

            case 'KYC_SUBMITTED':
                return {
                    icon: FileCheck, color: '#0284C7', bg: 'rgba(2,132,199,0.1)',
                    title: 'KYC Submitted',
                    description: 'Identity documents are under review by the Land Registrar.',
                };
            case 'KYC_APPROVED':
                return {
                    icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
                    title: 'KYC Approved',
                    description: 'Your profile has been verified. You can now register and transfer properties.',
                };
            case 'KYC_REJECTED':
                return {
                    icon: XCircle, color: '#EF4444', bg: 'rgba(239,68,68,0.1)',
                    title: 'KYC Rejected',
                    description: 'Your KYC application was rejected. Please review your documents and resubmit.',
                };

            case 'PROPERTY_REGISTERED':
                return {
                    icon: FileCheck, color: '#0284C7', bg: 'rgba(2,132,199,0.1)',
                    title: 'Property Registration Submitted',
                    description: `Registration requested${metadata?.surveyNumber ? ` for survey number ${metadata.surveyNumber}` : ''}. Awaiting authority validation.`,
                };
            case 'PROPERTY_APPROVED':
                return {
                    icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
                    title: 'Property Approved',
                    description: `Your property (${entity_id || 'N/A'}) has been officially registered and verified on-chain.`,
                };
            case 'PROPERTY_REJECTED':
                return {
                    icon: XCircle, color: '#EF4444', bg: 'rgba(239,68,68,0.1)',
                    title: 'Property Rejected',
                    description: `Registration for property (${entity_id || 'N/A'}) was rejected by the registrar.`,
                };
            case 'PROPERTY_UPDATED':
                return {
                    icon: FileCheck, color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',
                    title: 'Property Updated',
                    description: `Details for property ${entity_id || 'N/A'} have been updated.`,
                };
            case 'PROPERTY_FROZEN':
                return {
                    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Property Frozen',
                    description: `Property ${entity_id || 'N/A'} has been frozen. Transfers are suspended.`,
                };
            case 'PROPERTY_UNFROZEN':
                return {
                    icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
                    title: 'Property Unfrozen',
                    description: `Property ${entity_id || 'N/A'} has been unfrozen and is active again.`,
                };
            case 'PROPERTY_DOCUMENT_UPLOADED':
                return {
                    icon: FileCheck, color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',
                    title: 'Document Uploaded',
                    description: `A new verified deed/encumbrance document was uploaded for ${entity_id || 'N/A'}.`,
                };
            case 'ENCUMBRANCE_SET':
                return {
                    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Encumbrance Flagged',
                    description: `An encumbrance has been placed on property ${entity_id || 'N/A'}. Transfers locked.`,
                };
            case 'ENCUMBRANCE_CLEARED':
                return {
                    icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
                    title: 'Encumbrance Cleared',
                    description: `The encumbrance on property ${entity_id || 'N/A'} has been cleared.`,
                };

            case 'SALE_INITIATED':
                return {
                    icon: Send, color: '#0284C7', bg: 'rgba(2,132,199,0.1)',
                    title: 'Sale Initiated',
                    description: `A new sale agreement (${entity_id || 'N/A'}) was created.`,
                };
            case 'SALE_SIGNED':
            case 'SALE_BUYER_SIGNED':
                return {
                    icon: FileCheck, color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',
                    title: 'Agreement Signed by Buyer',
                    description: `Sale agreement ${entity_id || 'N/A'} was signed cryptographically by the buyer.`,
                };
            case 'SALE_SELLER_SIGNED':
                return {
                    icon: FileCheck, color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',
                    title: 'Agreement Signed by Seller',
                    description: `Sale agreement ${entity_id || 'N/A'} was signed cryptographically by the seller.`,
                };
            case 'SALE_AUTHORITY_APPROVED':
                return {
                    icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
                    title: 'Sale Approved by Authority',
                    description: `Sale agreement ${entity_id || 'N/A'} was approved by the registrar.`,
                };
            case 'SALE_COMPLETED':
                return {
                    icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
                    title: 'Transfer Completed',
                    description: `Ownership title transferred successfully on-chain for sale ${entity_id || 'N/A'}.`,
                };
            case 'SALE_CANCELLED':
                return {
                    icon: XCircle, color: '#EF4444', bg: 'rgba(239,68,68,0.1)',
                    title: 'Sale Cancelled',
                    description: `Sale transaction ${entity_id || 'N/A'} was terminated.`,
                };
            case 'SALE_FROZEN':
                return {
                    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Sale Frozen by Court',
                    description: `Sale transaction ${entity_id || 'N/A'} has been frozen pending review.`,
                };

            case 'FUND_BLOCK_REQUESTED':
                return {
                    icon: Landmark, color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',
                    title: 'Fund Block Requested',
                    description: `ASBA escrow fund block requested for sale ${entity_id || 'N/A'}.`,
                };
            case 'FUNDS_BLOCKED':
            case 'FUND_BLOCK_CONFIRMED':
                return {
                    icon: Landmark, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
                    title: 'Funds Blocked in Escrow',
                    description: `Escrow funds secured successfully via ASBA for sale ${entity_id || 'N/A'}.`,
                };
            case 'FUND_UNBLOCKED':
                return {
                    icon: Landmark, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Funds Released',
                    description: `Blocked funds have been released for sale ${entity_id || 'N/A'}.`,
                };

            case 'COURT_FREEZE_ISSUED':
                return {
                    icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.1)',
                    title: 'Court Freeze Order',
                    description: `A court injunction was applied to property ${entity_id || 'N/A'}.`,
                };
            case 'COURT_REVERSAL_ISSUED':
                return {
                    icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
                    title: 'Court Freeze Lifted',
                    description: `The court freeze on property ${entity_id || 'N/A'} has been lifted.`,
                };

            case 'WALLET_RECOVERY_REQUESTED':
                return {
                    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Wallet Recovery Requested',
                    description: 'A wallet recovery request is pending government verification.',
                };
            case 'WALLET_RECOVERY_VERIFIED':
                return {
                    icon: ShieldCheck, color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',
                    title: 'Identity Verified for Recovery',
                    description: 'Your identity has been verified. Wallet recovery is being processed.',
                };
            case 'WALLET_RECOVERY_COMPLETED':
                return {
                    icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.1)',
                    title: 'Wallet Recovered',
                    description: 'Your wallet has been successfully recovered and linked.',
                };

            default:
                return {
                    icon: Bell, color: '#64748B', bg: 'rgba(100,116,139,0.1)',
                    title: 'System Event Log',
                    description: `Action: ${action_type} on ${entity_type || 'system node'}`,
                };
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={32} style={{ color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, color: '#94A3B8', fontSize: '0.9rem' }}>Loading activity logs...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            <TopNavbar 
                title="Activity & Audit Feed" 
                subtitle="Chronological trail of verified land title state changes, KYC submissions, and multi-sig sales"
                showLogo={false} 
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
                            Recent Activity
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.25rem', margin: 0 }}>
                            Showing {notifications.length} immutable on-chain & registry event records.
                        </p>
                    </div>
                    <button
                        className="btn-cyan-outline"
                        onClick={fetchNotifications}
                        style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                    >
                        <RefreshCw size={14} /> Refresh Feed
                    </button>
                </div>

            {error && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.5rem',
                    color: '#EF4444',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <XCircle size={15} /> {error}
                </div>
            )}

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="digi-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: '#1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                        color: '#64748B'
                    }}>
                        <Bell size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '0.4rem' }}>No notifications yet</h3>
                    <p style={{ color: '#64748B', fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto' }}>
                        Property registrations, smart contract events, and system updates will be logged here in real-time.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {notifications.map((log) => {
                        const { icon: Icon, color, bg, title, description } = getNotificationDetails(log);
                        return (
                            <div
                                key={log.id}
                                className="digi-card"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem 1.25rem',
                                    borderLeft: `3px solid ${color}`,
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s ease, transform 0.15s ease'
                                }}
                                onClick={() => setSelectedLog(log)}
                            >
                                {/* Icon */}
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    flexShrink: 0,
                                    background: bg,
                                    border: `1px solid ${color}30`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icon size={18} style={{ color }} />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F8FAFC' }}>{title}</span>
                                        {log.entity_id && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#1E293B',
                                                padding: '0.15rem 0.45rem',
                                                borderRadius: '4px',
                                                color: '#94A3B8',
                                                fontFamily: 'JetBrains Mono',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: '220px',
                                            }}>
                                                {log.entity_id}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{
                                        color: '#94A3B8',
                                        fontSize: '0.825rem',
                                        lineHeight: 1.4,
                                        margin: '0.2rem 0 0',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {description}
                                    </p>
                                </div>

                                {/* Timestamp */}
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: '#64748B',
                                    fontFamily: 'JetBrains Mono',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    textAlign: 'right',
                                }}>
                                    {formatTime(log.created_at)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {selectedLog && (() => {
                const { icon: MIcon, color: mColor, bg: mBg, title: mTitle, description: mDesc } = getNotificationDetails(selectedLog);
                return (
                    <div
                        onClick={() => setSelectedLog(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '1.5rem',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%', maxWidth: '500px',
                                background: '#0F172A',
                                border: '1px solid #1E293B',
                                borderTop: `3px solid ${mColor}`,
                                borderRadius: '16px',
                                padding: '1.75rem',
                                position: 'relative',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            }}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{
                                    position: 'absolute', top: '1.25rem', right: '1.25rem',
                                    background: '#1E293B', border: '1px solid #334155',
                                    borderRadius: '8px', width: '30px', height: '30px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#94A3B8',
                                }}
                            >
                                <X size={15} />
                            </button>

                            {/* Icon + Title */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                                    background: mBg, border: `1px solid ${mColor}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <MIcon size={20} style={{ color: mColor }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>{mTitle}</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'JetBrains Mono' }}>
                                        {formatTime(selectedLog.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <p style={{
                                color: '#CBD5E1', fontSize: '0.875rem', lineHeight: 1.6,
                                margin: '0 0 1.25rem', padding: '0.85rem 1rem',
                                background: '#0B0F19', borderRadius: '10px',
                                border: '1px solid #1E293B',
                            }}>
                                {mDesc}
                            </p>

                            {/* Details Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {selectedLog.entity_id && (
                                    <div style={{
                                        gridColumn: '1 / -1', padding: '0.75rem',
                                        background: '#0B0F19', borderRadius: '8px',
                                        border: '1px solid #1E293B',
                                    }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Entity ID</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{
                                                fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: mColor,
                                                wordBreak: 'break-all', flex: 1,
                                            }}>
                                                {selectedLog.entity_id}
                                            </span>
                                            <button
                                                onClick={() => handleCopy(selectedLog.entity_id)}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: copied ? '#10B981' : '#64748B', padding: '2px', flexShrink: 0,
                                                }}
                                            >
                                                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div style={{ padding: '0.75rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Action</span>
                                    <span style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#E2E8F0' }}>
                                        {selectedLog.action_type}
                                    </span>
                                </div>

                                <div style={{ padding: '0.75rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Entity Type</span>
                                    <span style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#E2E8F0' }}>
                                        {selectedLog.entity_type || '—'}
                                    </span>
                                </div>

                                {selectedLog.actor_wallet && (
                                    <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Actor Wallet</span>
                                        <span style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#38BDF8', wordBreak: 'break-all' }}>
                                            {selectedLog.actor_wallet}
                                        </span>
                                    </div>
                                )}

                                {selectedLog.tx_hash && (
                                    <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Transaction Hash</span>
                                        <span style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#10B981', wordBreak: 'break-all' }}>
                                            {selectedLog.tx_hash}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
            </div>
        </div>
    );
};

export default Notifications;
