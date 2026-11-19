import React, { useEffect, useState } from 'react';
import { userService } from '../../services/user.service';
import { useAuth } from '../../context/AuthContext';
import {
    Bell, ShieldCheck, FileCheck, XCircle, Landmark,
    AlertTriangle, Send, Loader2, Copy, Check, X, Shield
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
                setError('Could not load notifications.');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchNotifications();
        }
    }, [user]);

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getNotificationDetails = (log) => {
        const { action_type, entity_id, entity_type, metadata } = log;

        switch (action_type) {
            case 'USER_REGISTERED':
                return {
                    icon: ShieldCheck, color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
                    title: 'Account Created',
                    description: 'Your user profile was successfully created.',
                };
            case 'KYC_SUBMITTED':
                return {
                    icon: FileCheck, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
                    title: 'Identity Verification Submitted',
                    description: 'Your identity documents have been submitted for review.',
                };
            case 'KYC_APPROVED':
                return {
                    icon: ShieldCheck, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
                    title: 'Identity Verified',
                    description: 'Your identity is fully verified. You can now register and sell properties.',
                };
            case 'KYC_REJECTED':
                return {
                    icon: XCircle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
                    title: 'Identity Verification Needs Attention',
                    description: 'Your verification was not approved. Please review remarks and resubmit.',
                };
            case 'PROPERTY_REGISTERED':
                return {
                    icon: FileCheck, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
                    title: 'Property Registration Submitted',
                    description: `Property registration application submitted${metadata?.surveyNumber ? ` for Survey #${metadata.surveyNumber}` : ''}.`,
                };
            case 'PROPERTY_APPROVED':
                return {
                    icon: ShieldCheck, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
                    title: 'Property Approved & Verified',
                    description: `Your property (${entity_id || 'N/A'}) has been verified and registered.`,
                };
            case 'PROPERTY_REJECTED':
                return {
                    icon: XCircle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
                    title: 'Property Registration Rejected',
                    description: `Property registration (${entity_id || 'N/A'}) was rejected by the authority.`,
                };
            case 'SALE_INITIATED':
                return {
                    icon: Send, color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
                    title: 'Sale Agreement Created',
                    description: `A new sale agreement (${entity_id || 'N/A'}) was created.`,
                };
            case 'SALE_BUYER_SIGNED':
            case 'SALE_SIGNED':
                return {
                    icon: FileCheck, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
                    title: 'Sale Agreement Signed by Buyer',
                    description: `The buyer has signed the sale agreement (${entity_id || 'N/A'}).`,
                };
            case 'SALE_AUTHORITY_APPROVED':
                return {
                    icon: ShieldCheck, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
                    title: 'Sale Approved by Authority',
                    description: `Transaction ${entity_id || 'N/A'} received official protocol approval.`,
                };
            case 'SALE_COMPLETED':
                return {
                    icon: ShieldCheck, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
                    title: 'Property Transfer Completed',
                    description: `Property ownership successfully transferred for sale ${entity_id || 'N/A'}.`,
                };
            case 'FUND_BLOCK_CONFIRMED':
            case 'FUNDS_BLOCKED':
                return {
                    icon: Landmark, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
                    title: 'Payment Locked in Escrow',
                    description: `Bank funds safely placed on hold for transaction ${entity_id || 'N/A'}.`,
                };
            case 'COURT_FREEZE_ISSUED':
                return {
                    icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
                    title: 'Property On Hold (Court Order)',
                    description: `A legal hold order was recorded for property ${entity_id || 'N/A'}.`,
                };
            default:
                return {
                    icon: Bell, color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0',
                    title: 'System Notification',
                    description: `Action: ${action_type} on ${entity_type || 'system'}`,
                };
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={36} style={{ color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>Loading Notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-md">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <h1 className="page-title">Notifications & Updates</h1>
                    <p className="page-subtitle">
                        Recent activity and alerts for your account and properties.
                    </p>
                </div>
                <span className="gov-badge" style={{ '--badge-bg': '#EFF6FF', '--badge-color': '#1E40AF', '--badge-border': '#BFDBFE' }}>
                    <Bell size={14} /> {notifications.length} Notification{notifications.length !== 1 ? 's' : ''}
                </span>
            </div>

            {error && (
                <div className="alert-message error">
                    <XCircle size={16} /> {error}
                </div>
            )}

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="empty-state">
                    <Bell size={44} style={{ color: '#94A3B8', margin: '0 auto 1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>No Notifications</h3>
                    <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Updates and alerts will appear here as you buy, sell, or register properties.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {notifications.map((log) => {
                        const { icon: Icon, color, bg, border, title, description } = getNotificationDetails(log);
                        return (
                            <div
                                key={log.id}
                                className="gov-card"
                                style={{
                                    borderLeft: `4px solid ${color}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.25rem',
                                    padding: '1.25rem 1.5rem',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setSelectedLog(log)}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: bg,
                                    border: `1px solid ${border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: color,
                                    flexShrink: 0
                                }}>
                                    <Icon size={18} />
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                            {title}
                                        </h4>
                                        {log.entity_id && (
                                            <span className="mono" style={{ fontSize: '0.7rem', color: '#64748B', background: '#F1F5F9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                {log.entity_id?.slice(0, 12)}...
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                                        {description}
                                    </p>
                                </div>

                                <span style={{ fontSize: '0.75rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                                    {formatTime(log.created_at)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {selectedLog && (() => {
                const { icon: MIcon, color: mColor, bg: mBg, border: mBorder, title: mTitle, description: mDesc } = getNotificationDetails(selectedLog);
                return (
                    <div
                        onClick={() => setSelectedLog(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '1.5rem'
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            className="gov-card"
                            style={{
                                width: '100%', maxWidth: '500px',
                                padding: '2rem', borderTop: `4px solid ${mColor}`,
                                position: 'relative'
                            }}
                        >
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{
                                    position: 'absolute', top: '1.25rem', right: '1.25rem',
                                    background: '#F1F5F9', border: '1px solid #E2E8F0',
                                    borderRadius: '6px', width: '28px', height: '28px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#64748B'
                                }}
                            >
                                <X size={14} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: mBg, border: `1px solid ${mBorder}`, color: mColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MIcon size={22} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{mTitle}</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{formatTime(selectedLog.created_at)}</span>
                                </div>
                            </div>

                            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
                                {mDesc}
                            </p>

                            <div className="gov-data-grid" style={{ margin: 0 }}>
                                <div className="gov-data-item">
                                    <span className="label">Event Type</span>
                                    <span className="value mono" style={{ fontSize: '0.8rem' }}>{selectedLog.action_type}</span>
                                </div>
                                <div className="gov-data-item">
                                    <span className="label">Category</span>
                                    <span className="value mono" style={{ fontSize: '0.8rem' }}>{selectedLog.entity_type || '—'}</span>
                                </div>
                                {selectedLog.entity_id && (
                                    <div className="gov-data-item" style={{ gridColumn: '1 / -1' }}>
                                        <span className="label">Reference ID</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span className="value mono" style={{ fontSize: '0.78rem', color: '#1E40AF', wordBreak: 'break-all' }}>
                                                {selectedLog.entity_id}
                                            </span>
                                            <button
                                                onClick={() => handleCopy(selectedLog.entity_id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#059669' : '#94A3B8' }}
                                            >
                                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
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
