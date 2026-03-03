import React, { useEffect, useState } from 'react';
import { userService } from '../../services/user.service';
import { useAuth } from '../../context/AuthContext';
import {
    Bell, ShieldCheck, FileCheck, XCircle, Landmark,
    AlertTriangle, Send, Loader2, ArrowRight
} from 'lucide-react';
import './PropertyPages.css';

const Notifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    // Format utility for timestamps
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper to map audit events to UI representation
    const getNotificationDetails = (log) => {
        const { action_type, entity_id, entity_type, metadata } = log;

        switch (action_type) {
            case 'USER_REGISTERED':
                return {
                    icon: ShieldCheck, color: 'hsl(255,85%,65%)', bg: 'rgba(139,92,246,0.1)',
                    title: 'Account Created',
                    description: 'Your Digiverify account was successfully registered.',
                };
            case 'KYC_SUBMITTED':
                return {
                    icon: FileCheck, color: 'hsl(200,85%,55%)', bg: 'rgba(56,189,248,0.1)',
                    title: 'KYC Submitted',
                    description: 'Your documents are currently under review by the authority.',
                };
            case 'KYC_APPROVED':
                return {
                    icon: ShieldCheck, color: 'hsl(142,71%,45%)', bg: 'rgba(34,197,94,0.1)',
                    title: 'KYC Approved',
                    description: 'Your profile has been verified. You can now register and trade properties.',
                };
            case 'KYC_REJECTED':
                return {
                    icon: XCircle, color: 'hsl(348,83%,47%)', bg: 'rgba(225,29,72,0.1)',
                    title: 'KYC Rejected',
                    description: 'Your KYC application was rejected. Please review your documents and resubmit.',
                };
            case 'PROPERTY_REGISTERED':
                return {
                    icon: FileCheck, color: 'hsl(200,85%,55%)', bg: 'rgba(56,189,248,0.1)',
                    title: 'Property Registration Requested',
                    description: `Registration requested for survey number ${metadata?.surveyNumber}. Awaiting approval.`,
                };
            case 'PROPERTY_APPROVED':
                return {
                    icon: ShieldCheck, color: 'hsl(142,71%,45%)', bg: 'rgba(34,197,94,0.1)',
                    title: 'Property Approved',
                    description: `Your property (${entity_id?.slice(0, 8)}...) has been officially registered and verified on-chain.`,
                };
            case 'PROPERTY_REJECTED':
                return {
                    icon: XCircle, color: 'hsl(348,83%,47%)', bg: 'rgba(225,29,72,0.1)',
                    title: 'Property Rejected',
                    description: `Registration for property (${entity_id?.slice(0, 8)}...) was rejected.`,
                };
            case 'SALE_INITIATED':
                return {
                    icon: Send, color: 'hsl(255,85%,65%)', bg: 'rgba(139,92,246,0.1)',
                    title: 'Sale Initiated',
                    description: `A sale transaction for property ${metadata?.propertyId?.slice(0, 8)}... was created.`,
                };
            case 'SALE_SIGNED':
                return {
                    icon: FileCheck, color: 'hsl(280,80%,60%)', bg: 'rgba(168,85,247,0.1)',
                    title: 'Agreement Signed',
                    description: `The sale agreement for transaction #${entity_id} was signed.`,
                };
            case 'FUNDS_BLOCKED':
                return {
                    icon: Landmark, color: 'hsl(142,71%,45%)', bg: 'rgba(34,197,94,0.1)',
                    title: 'Funds Blocked',
                    description: `Funds blocked successfully via ASBA for sale #${entity_id}.`,
                };
            case 'SALE_COMPLETED':
                return {
                    icon: ShieldCheck, color: 'hsl(142,71%,45%)', bg: 'rgba(34,197,94,0.1)',
                    title: 'Property Sale Completed',
                    description: `Property ownership transferred successfully for sale #${entity_id}.`,
                };
            case 'PROPERTY_FROZEN':
                return {
                    icon: AlertTriangle, color: 'hsl(38,92%,50%)', bg: 'rgba(245,158,11,0.1)',
                    title: 'Court Freeze Alert',
                    description: `A court freeze order was applied to property #${entity_id?.slice(0, 8)}.... Transfers are disabled.`,
                };
            case 'PROPERTY_FORCE_TRANSFERRED':
                return {
                    icon: AlertTriangle, color: 'hsl(348,83%,47%)', bg: 'rgba(225,29,72,0.1)',
                    title: 'Court Forced Transfer',
                    description: `Property #${entity_id?.slice(0, 8)}... was forcibly transferred by court order.`,
                };
            default:
                return {
                    icon: Bell, color: 'hsl(220,15%,60%)', bg: 'rgba(255,255,255,0.05)',
                    title: 'System Event',
                    description: `Action: ${action_type} on ${entity_type || 'system'}`,
                };
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container" style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: 'hsl(255,85%,65%)' }} className="animate-spin" />
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container container-sm">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.1))',
                    border: '1px solid rgba(139,92,246,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Bell size={24} style={{ color: 'hsl(255,85%,65%)' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
                        Notifications
                    </h1>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                        Your recent account activity and system alerts
                    </p>
                </div>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
                    borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem',
                    color: 'hsl(var(--color-danger))', fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    <XCircle size={16} /> {error}
                </div>
            )}

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <Bell size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'hsl(255,85%,65%)', margin: '0 auto 1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>All Caught Up</h3>
                    <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                        You don't have any notifications yet. System events and status updates will appear here.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {notifications.map(log => {
                        const { icon: Icon, color, bg, title, description } = getNotificationDetails(log);
                        return (
                            <div key={log.id} className="glass-panel hover-glow" style={{
                                padding: '1.25rem 1.5rem',
                                display: 'flex', gap: '1.25rem', alignItems: 'flex-start',
                                transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
                            }}>
                                {/* Colored edge highlight */}
                                <div style={{
                                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                                    background: color
                                }}></div>

                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                    background: bg, border: `1px solid ${color}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon size={18} style={{ color }} />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{title}</h4>
                                        <span style={{ fontSize: '0.75rem', color: 'hsl(220,15%,50%)', fontFamily: 'monospace' }}>
                                            {formatTime(log.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                                        {description}
                                    </p>

                                    {/* Action tags where applicable */}
                                    {log.entity_id && (
                                        <div style={{ marginTop: '0.75rem' }}>
                                            <span style={{
                                                fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.5rem', borderRadius: '4px',
                                                color: 'hsl(var(--color-text-secondary))', fontFamily: 'monospace'
                                            }}>
                                                Ref: {log.entity_id?.slice(0, 8)}...
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Notifications;
