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

    // Helper to map audit events to UI representation
    const getNotificationDetails = (log) => {
        const { action_type, entity_id, entity_type, metadata } = log;

        switch (action_type) {
            case 'USER_REGISTERED':
                return {
                    icon: ShieldCheck, color: '#A855F7', bg: 'rgba(168,85,247,0.1)',
                    title: 'Account Created',
                    description: 'Your Digiverify account was successfully registered.',
                };
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
            case 'PROPERTY_REGISTERED':
                return {
                    icon: FileCheck, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',
                    title: 'Property Registration Requested',
                    description: `Registration requested for survey number ${metadata?.surveyNumber}. Awaiting approval.`,
                };
            case 'PROPERTY_APPROVED':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Property Approved',
                    description: `Your property (${entity_id?.slice(0, 8)}...) has been officially registered and verified on-chain.`,
                };
            case 'PROPERTY_REJECTED':
                return {
                    icon: XCircle, color: '#FF007F', bg: 'rgba(255,0,127,0.1)',
                    title: 'Property Rejected',
                    description: `Registration for property (${entity_id?.slice(0, 8)}...) was rejected.`,
                };
            case 'SALE_INITIATED':
                return {
                    icon: Send, color: '#A855F7', bg: 'rgba(168,85,247,0.1)',
                    title: 'Sale Initiated',
                    description: `A sale transaction for property ${metadata?.propertyId?.slice(0, 8)}... was created.`,
                };
            case 'SALE_SIGNED':
                return {
                    icon: FileCheck, color: '#00E5FF', bg: 'rgba(0,229,255,0.1)',
                    title: 'Agreement Signed',
                    description: `The sale agreement for transaction #${entity_id?.slice(0,8)} was cryptographically signed.`,
                };
            case 'FUNDS_BLOCKED':
                return {
                    icon: Landmark, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Funds Blocked',
                    description: `Escrow funds secured successfully via ASBA for sale #${entity_id?.slice(0,8)}.`,
                };
            case 'SALE_COMPLETED':
                return {
                    icon: ShieldCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',
                    title: 'Property Transfer Complete',
                    description: `Asset ownership transferred successfully for sale #${entity_id?.slice(0,8)}.`,
                };
            case 'PROPERTY_FROZEN':
                return {
                    icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',
                    title: 'Court Freeze Alert',
                    description: `A strict court freeze order was applied to property #${entity_id?.slice(0, 8)}.... All transfers disabled.`,
                };
            case 'PROPERTY_FORCE_TRANSFERRED':
                return {
                    icon: AlertTriangle, color: '#FF007F', bg: 'rgba(255,0,127,0.1)',
                    title: 'Court Forced Transfer',
                    description: `Property #${entity_id?.slice(0, 8)}... was forcibly transferred by government override.`,
                };
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                        width: '3.5rem', height: '3.5rem', borderRadius: '12px',
                        background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(0,229,255,0.2)'
                    }}>
                        <Bell size={24} style={{ color: '#00E5FF' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'white', letterSpacing: '-0.02em' }}>
                            System <span style={{ color: '#00E5FF' }}>Notifications</span>
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.3rem', margin: 0 }}>
                            Real-time chronolog of system alerts and node activity
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '12px', padding: '1rem', marginBottom: '2rem',
                    color: '#EF4444', fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    <XCircle size={16} /> {error}
                </div>
            )}

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="cyber-hud-bar" style={{ display: 'block', padding: '5rem 2rem', textAlign: 'center' }}>
                    <div className="cyber-card-glow-orb" style={{ background: '#00E5FF', top: '50%', left: '50%', width: '15rem', height: '15rem', opacity: 0.1, transform: 'translate(-50%, -50%)' }}></div>
                    <Bell size={48} style={{ opacity: 0.3, marginBottom: '1.5rem', color: '#00E5FF', margin: '0 auto 1.5rem' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>No Active Logs</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                        Your activity ledger is currently empty. Relevant system events will populate here.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {notifications.map(log => {
                        const { icon: Icon, color, bg, title, description } = getNotificationDetails(log);
                        return (
                            <div key={log.id} className="cyber-hud-bar scale-in" style={{
                                padding: '1.5rem 2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start',
                                position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'row',
                                borderLeft: `3px solid transparent`,
                                backgroundImage: `linear-gradient(rgba(11,7,20,0.8), rgba(11,7,20,0.8)), linear-gradient(to right, ${color}, rgba(255,255,255,0.05))`
                            }}>
                                {/* Active colored edge */}
                                <div style={{
                                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: color,
                                    boxShadow: `0 0 10px ${color}`
                                }}></div>

                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                                    background: bg, border: `1px solid ${color}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon size={20} style={{ color }} />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{title}</h4>
                                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'JetBrains Mono', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                            {formatTime(log.created_at)}
                                        </span>
                                    </div>
                                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                                        {description}
                                    </p>

                                    {/* Action tags where applicable */}
                                    {log.entity_id && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <span style={{
                                                fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                background: 'rgba(0,0,0,0.4)', padding: '0.35rem 0.6rem', borderRadius: '4px',
                                                color: color, fontFamily: 'JetBrains Mono', border: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                REF ID: {log.entity_id?.slice(0, 8)}...
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
