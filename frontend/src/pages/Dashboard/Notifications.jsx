import React, { useEffect, useState } from 'react';
import { userService } from '../../services/user.service';
import { useAuth } from '../../context/AuthContext';
import {
    Bell, ShieldCheck, FileCheck, XCircle, Landmark,
    AlertTriangle, Send, Loader2, ArrowRight, Copy, CheckCircle2, X
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

    useEffect(() => {
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
            // ── Auth ────────────────────────────────────────────────────
            case 'USER_REGISTERED':
                return {
                    icon: ShieldCheck, color: '#A855F7', bg: 'rgba(168,85,247,0.1)',
                    title: 'Account Created',
                    description: 'Your Digiverify account was successfully registered.',
                };

            // ── KYC ─────────────────────────────────────────────────────
            case 'KYC_SUBMITTED':
                return {
                    icon: FileCheck, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',
                    title: 'KYC Submitted',
                    description: 'Your documents are currently under review by the authority.',
                };
            case 'KYC_APPROVED':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'KYC Approved',
                    description: 'Your profile has been verified. You can now register and trade properties.',
                };
            case 'KYC_REJECTED':
                return {
                    icon: XCircle, color: '#FF007F', bg: 'rgba(255,0,127,0.1)',
                    title: 'KYC Rejected',
                    description: 'Your KYC application was rejected. Please review your documents and resubmit.',
                };

            // ── Property ────────────────────────────────────────────────
            case 'PROPERTY_REGISTERED':
                return {
                    icon: FileCheck, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',
                    title: 'Property Registration Requested',
                    description: `Registration requested${metadata?.surveyNumber ? ` for survey number ${metadata.surveyNumber}` : ''}. Awaiting approval.`,
                };
            case 'PROPERTY_APPROVED':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Property Approved',
                    description: `Your property (${entity_id || 'N/A'}) has been officially registered and verified on-chain.`,
                };
            case 'PROPERTY_REJECTED':
                return {
                    icon: XCircle, color: '#FF007F', bg: 'rgba(255,0,127,0.1)',
                    title: 'Property Rejected',
                    description: `Registration for property (${entity_id || 'N/A'}) was rejected.`,
                };
            case 'PROPERTY_UPDATED':
                return {
                    icon: FileCheck, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',
                    title: 'Property Updated',
                    description: `Details for property ${entity_id || 'N/A'} have been updated.`,
                };
            case 'PROPERTY_FROZEN':
                return {
                    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Property Frozen',
                    description: `Property ${entity_id || 'N/A'} has been frozen. All transfers are suspended.`,
                };
            case 'PROPERTY_UNFROZEN':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Property Unfrozen',
                    description: `Property ${entity_id || 'N/A'} has been unfrozen and is active again.`,
                };
            case 'PROPERTY_DOCUMENT_UPLOADED':
                return {
                    icon: FileCheck, color: '#A855F7', bg: 'rgba(168,85,247,0.1)',
                    title: 'Document Uploaded',
                    description: `A new document was uploaded for property ${entity_id || 'N/A'}.`,
                };
            case 'ENCUMBRANCE_SET':
                return {
                    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Encumbrance Flagged',
                    description: `An encumbrance has been placed on property ${entity_id || 'N/A'}. The property cannot be transferred until cleared.`,
                };
            case 'ENCUMBRANCE_CLEARED':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Encumbrance Cleared',
                    description: `The encumbrance on property ${entity_id || 'N/A'} has been officially cleared.`,
                };

            // ── Sale ────────────────────────────────────────────────────
            case 'SALE_INITIATED':
                return {
                    icon: Send, color: '#A855F7', bg: 'rgba(168,85,247,0.1)',
                    title: 'Sale Initiated',
                    description: `A new sale transaction (${entity_id || 'N/A'}) was created.`,
                };
            case 'SALE_SIGNED':           // legacy alias kept for old records
            case 'SALE_BUYER_SIGNED':
                return {
                    icon: FileCheck, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',
                    title: 'Agreement Signed by Buyer',
                    description: `Sale agreement for transaction ${entity_id || 'N/A'} was cryptographically signed by the buyer.`,
                };
            case 'SALE_SELLER_SIGNED':
                return {
                    icon: FileCheck, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',
                    title: 'Agreement Signed by Seller',
                    description: `Sale agreement for transaction ${entity_id || 'N/A'} was cryptographically signed by the seller.`,
                };
            case 'SALE_AUTHORITY_APPROVED':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Sale Approved by Authority',
                    description: `Transaction ${entity_id || 'N/A'} has been approved by the land authority.`,
                };
            case 'SALE_COMPLETED':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Property Transfer Complete',
                    description: `Asset ownership transferred successfully for sale ${entity_id || 'N/A'}.`,
                };
            case 'SALE_CANCELLED':
                return {
                    icon: XCircle, color: '#FF007F', bg: 'rgba(255,0,127,0.1)',
                    title: 'Sale Cancelled',
                    description: `Sale transaction ${entity_id || 'N/A'} has been cancelled.`,
                };
            case 'SALE_FROZEN':
                return {
                    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Sale Frozen by Court',
                    description: `Sale transaction ${entity_id || 'N/A'} has been frozen pending court review.`,
                };

            // ── Bank / ASBA ─────────────────────────────────────────────
            case 'FUND_BLOCK_REQUESTED':
                return {
                    icon: Landmark, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',
                    title: 'Fund Block Requested',
                    description: `A fund block request was submitted to the bank for sale ${entity_id || 'N/A'}.`,
                };
            case 'FUNDS_BLOCKED':         // legacy alias
            case 'FUND_BLOCK_CONFIRMED':
                return {
                    icon: Landmark, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Funds Blocked (Escrow)',
                    description: `Escrow funds secured successfully via ASBA for sale ${entity_id || 'N/A'}.`,
                };
            case 'FUND_UNBLOCKED':
                return {
                    icon: Landmark, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Funds Released',
                    description: `Blocked funds have been released for sale ${entity_id || 'N/A'}.`,
                };

            // ── Court ───────────────────────────────────────────────────
            case 'COURT_FREEZE_ISSUED':
                return {
                    icon: AlertTriangle, color: '#FF007F', bg: 'rgba(255,0,127,0.1)',
                    title: 'Court Freeze Issued',
                    description: `A strict court freeze order was applied to property ${entity_id || 'N/A'}. All transfers disabled.`,
                };
            case 'COURT_REVERSAL_ISSUED':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Court Freeze Reversed',
                    description: `The court freeze on property ${entity_id || 'N/A'} has been lifted.`,
                };
            case 'COURT_FORCE_TRANSFER':
            case 'PROPERTY_FORCE_TRANSFERRED':  // legacy alias
            case 'NFT_FORCE_TRANSFERRED':
                return {
                    icon: AlertTriangle, color: '#FF007F', bg: 'rgba(255,0,127,0.1)',
                    title: 'Court Forced Transfer',
                    description: `Property ${entity_id || 'N/A'} was forcibly transferred by government override.`,
                };

            // ── Wallet Recovery ─────────────────────────────────────────
            case 'WALLET_RECOVERY_REQUESTED':
                return {
                    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Wallet Recovery Requested',
                    description: 'A wallet recovery request has been submitted and is pending identity verification.',
                };
            case 'WALLET_RECOVERY_VERIFIED':
                return {
                    icon: ShieldCheck, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',
                    title: 'Identity Verified for Recovery',
                    description: 'Your identity has been verified. Wallet recovery is being processed.',
                };
            case 'WALLET_RECOVERY_COMPLETED':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Wallet Recovery Complete',
                    description: 'Your wallet has been successfully recovered and re-linked to your account.',
                };
            case 'WALLET_RECOVERY_REJECTED':
                return {
                    icon: XCircle, color: '#FF007F', bg: 'rgba(255,0,127,0.1)',
                    title: 'Wallet Recovery Rejected',
                    description: 'Your wallet recovery request was rejected. Please contact support for assistance.',
                };

            // ── Ownership / NFT ─────────────────────────────────────────
            case 'OWNERSHIP_TRANSFERRED':
                return {
                    icon: Send, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Ownership Transferred',
                    description: `Ownership of property ${entity_id || 'N/A'} has been transferred on-chain.`,
                };
            case 'NFT_MINTED':
                return {
                    icon: ShieldCheck, color: '#A855F7', bg: 'rgba(168,85,247,0.1)',
                    title: 'Property NFT Minted',
                    description: `A property NFT was minted on-chain for asset ${entity_id || 'N/A'}.`,
                };

            // ── Fallback ────────────────────────────────────────────────
            default:
                return {
                    icon: Bell, color: '#9ca3af', bg: 'rgba(255,255,255,0.05)',
                    title: 'System Event Log',
                    description: `Action: ${action_type} on ${entity_type || 'system node'}`,
                };
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#00E5FF' }} className="animate-spin" />
                    <p style={{ fontWeight: 800, letterSpacing: '0.1em', color: '#00E5FF', fontSize: '0.9rem' }}>SYNCING LOGS...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-md animate-fade-in" style={{ paddingBottom: '6rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '3rem', height: '3rem', borderRadius: '10px',
                        background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 15px rgba(0,229,255,0.15)'
                    }}>
                        <Bell size={20} style={{ color: '#00E5FF' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'white', letterSpacing: '-0.02em' }}>
                            System <span style={{ color: '#00E5FF' }}>Notifications</span>
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                            {notifications.length} event{notifications.length !== 1 ? 's' : ''} logged
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem',
                    color: '#EF4444', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    <XCircle size={14} /> {error}
                </div>
            )}

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div style={{
                    padding: '5rem 2rem', textAlign: 'center',
                    background: 'rgba(11,7,20,0.5)', borderRadius: '16px',
                    border: '1px dashed rgba(255,255,255,0.08)'
                }}>
                    <Bell size={40} style={{ opacity: 0.2, color: '#00E5FF', marginBottom: '1.25rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem' }}>No Active Logs</h3>
                    <p style={{ color: '#6b7280', fontSize: '0.85rem', maxWidth: '280px', margin: '0 auto' }}>
                        System events will appear here as they occur.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.map((log, idx) => {
                        const { icon: Icon, color, bg, title, description } = getNotificationDetails(log);
                        return (
                            <div key={log.id} style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '1rem 1.25rem',
                                background: 'rgba(11,7,20,0.5)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.04)',
                                borderLeft: `3px solid ${color}`,
                                transition: 'all 0.25s ease',
                                cursor: 'pointer',
                                animation: `slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.03}s backwards`,
                            }}
                            onClick={() => setSelectedLog(log)}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(20,15,35,0.7)';
                                e.currentTarget.style.borderColor = `${color}25`;
                                e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3), inset 0 0 30px ${color}08`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(11,7,20,0.5)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            >
                                {/* Icon */}
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                                    background: bg, border: `1px solid ${color}25`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon size={16} style={{ color }} />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{title}</span>
                                        {log.entity_id && (
                                            <span style={{
                                                fontSize: '0.55rem', letterSpacing: '0.04em',
                                                background: `${color}12`, padding: '0.15rem 0.4rem', borderRadius: '4px',
                                                color: `${color}CC`, fontFamily: 'JetBrains Mono',
                                                border: `1px solid ${color}20`, whiteSpace: 'nowrap',
                                                overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px',
                                            }}>
                                                {log.entity_id}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{
                                        color: '#9ca3af', fontSize: '0.8rem', lineHeight: 1.5, margin: '0.25rem 0 0',
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {description}
                                    </p>
                                </div>

                                {/* Timestamp */}
                                <span style={{
                                    fontSize: '0.65rem', color: '#4b5563', fontFamily: 'JetBrains Mono',
                                    whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right',
                                }}>
                                    {formatTime(log.created_at)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Detail Modal ── */}
            {selectedLog && (() => {
                const { icon: MIcon, color: mColor, bg: mBg, title: mTitle, description: mDesc } = getNotificationDetails(selectedLog);
                return (
                    <div
                        onClick={() => setSelectedLog(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '2rem',
                            animation: 'fade-in 0.2s ease-out',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%', maxWidth: '480px',
                                background: 'rgba(15,10,25,0.95)',
                                border: `1px solid ${mColor}30`,
                                borderTop: `3px solid ${mColor}`,
                                borderRadius: '16px',
                                padding: '2rem',
                                position: 'relative',
                                boxShadow: `0 25px 60px rgba(0,0,0,0.5), 0 0 40px ${mColor}15`,
                                animation: 'slide-up-fade 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{
                                    position: 'absolute', top: '1rem', right: '1rem',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px', width: '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#6b7280', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                            >
                                <X size={14} />
                            </button>

                            {/* Icon + Title */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                                    background: mBg, border: `1px solid ${mColor}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <MIcon size={20} style={{ color: mColor }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>{mTitle}</h3>
                                    <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'JetBrains Mono' }}>
                                        {formatTime(selectedLog.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <p style={{
                                color: '#9ca3af', fontSize: '0.85rem', lineHeight: 1.7,
                                margin: '0 0 1.5rem', padding: '1rem',
                                background: 'rgba(0,0,0,0.3)', borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                {mDesc}
                            </p>

                            {/* Details Grid */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                            }}>
                                {selectedLog.entity_id && (
                                    <div style={{
                                        gridColumn: '1 / -1', padding: '0.75rem',
                                        background: 'rgba(0,0,0,0.25)', borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                    }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', display: 'block', marginBottom: '0.3rem' }}>Entity ID</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: mColor,
                                                wordBreak: 'break-all', flex: 1,
                                            }}>
                                                {selectedLog.entity_id}
                                            </span>
                                            <button
                                                onClick={() => handleCopy(selectedLog.entity_id)}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: copied ? mColor : '#6b7280', padding: '2px', flexShrink: 0,
                                                    transition: 'color 0.2s',
                                                }}
                                            >
                                                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', display: 'block', marginBottom: '0.3rem' }}>Action</span>
                                    <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#e5e7eb' }}>
                                        {selectedLog.action_type}
                                    </span>
                                </div>

                                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', display: 'block', marginBottom: '0.3rem' }}>Entity Type</span>
                                    <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#e5e7eb' }}>
                                        {selectedLog.entity_type || '—'}
                                    </span>
                                </div>

                                {selectedLog.actor_wallet && (
                                    <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', display: 'block', marginBottom: '0.3rem' }}>Actor Wallet</span>
                                        <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', color: '#A855F7', wordBreak: 'break-all' }}>
                                            {selectedLog.actor_wallet}
                                        </span>
                                    </div>
                                )}

                                {selectedLog.tx_hash && (
                                    <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', display: 'block', marginBottom: '0.3rem' }}>Transaction Hash</span>
                                        <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', color: '#22C55E', wordBreak: 'break-all' }}>
                                            {selectedLog.tx_hash}
                                        </span>
                                    </div>
                                )}

                                {selectedLog.metadata?.reason && (
                                    <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#EF4444', display: 'block', marginBottom: '0.3rem' }}>Administrative Note / Reason</span>
                                        <span style={{ fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.4, display: 'block' }}>
                                            {selectedLog.metadata.reason}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default Notifications;
