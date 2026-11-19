import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../../services/admin.service';
import {
    Gavel,
    ShieldAlert,
    Scale,
    CheckCircle2,
    Plus,
    Search,
    AlertCircle,
    Eye,
    Unlock,
    ArrowRightLeft,
    X,
    Loader2,
    Lock,
    RefreshCcw,
    FileText,
    UploadCloud,
    Building2,
    ShieldCheck
} from 'lucide-react';

const DisputeCenter = () => {
    // ── API State ────────────────────────────────────────────────
    const [properties, setProperties] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    // ── UI Filter State ──────────────────────────────────────────
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [toastMessage, setToastMessage] = useState(null);

    // ── Modal States ─────────────────────────────────────────────
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [transferModalDispute, setTransferModalDispute] = useState(null);
    const [liftModalDispute, setLiftModalDispute] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // ── Injunction Form State ────────────────────────────────────
    const [newInjunction, setNewInjunction] = useState({
        propertyId: '',
        courtName: 'High Court of Karnataka (Principal Bench)',
        caseNumber: '',
        stayOrderNumber: '',
        disputeType: 'High Court Injunction',
        judgeName: 'Hon. Justice Bench',
        plaintiff: '',
        defendant: '',
        claimDetails: '',
        courtOrderHash: 'QmZtmD2qtW34c8LzS5JgQGnvA8kGZ6Bq4y3pL7uF1k',
        courtOrderFile: null
    });

    // ── Lift Lock Form State ─────────────────────────────────────
    const [liftForm, setLiftForm] = useState({
        courtOrderHash: 'QmP3kL8mR1nQ7vT5jC9wA4sF2zX6dE0gB7yH9uK4i',
        reason: 'Stay order vacated and cleared by competent judicial authority.',
        courtOrderFile: null
    });

    // ── Force Transfer Form State ────────────────────────────────
    const [transferForm, setTransferForm] = useState({
        decreeNumber: '',
        courtName: 'High Court of Karnataka',
        newBeneficiaryWallet: '',
        beneficiaryName: '',
        courtOrderHash: 'QmY8tL5nQ2vK9aR3jC7mP4sF1wX0zD6eB8gH5uT9i',
        judgeNotes: '',
        courtOrderFile: null
    });

    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    // ── Data Fetching ────────────────────────────────────────────
    const fetchData = async () => {
        try {
            setError('');
            const [propRes, auditRes] = await Promise.allSettled([
                adminService.listProperties(),
                adminService.getAuditLogs({ limit: 100 })
            ]);

            if (propRes.status === 'fulfilled') {
                const propData = propRes.value.data?.data || propRes.value.data || [];
                setProperties(Array.isArray(propData) ? propData : []);
            } else {
                console.error('Failed to fetch properties:', propRes.reason);
            }

            if (auditRes.status === 'fulfilled') {
                const auditData = auditRes.value.data?.data || auditRes.value.data || [];
                setAuditLogs(Array.isArray(auditData) ? auditData : []);
            } else {
                console.error('Failed to fetch audit logs:', auditRes.reason);
            }
        } catch (err) {
            console.error('DisputeCenter fetch error:', err);
            setError('Failed to load judicial records. Please refresh.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // ── Build Dispute Records from Real Backend Data ─────────────
    // Combine properties with status 'frozen', 'under_dispute', or encumbered, and attach audit log information
    const disputeRecords = useMemo(() => {
        // Map audit logs by propertyId
        const auditByProperty = {};
        auditLogs.forEach(log => {
            if (log.entity_id || log.entityId) {
                const eId = log.entity_id || log.entityId;
                if (!auditByProperty[eId]) {
                    auditByProperty[eId] = [];
                }
                auditByProperty[eId].push(log);
            }
        });

        return properties.map(p => {
            const isFrozen = p.status === 'frozen';
            const isUnderDispute = p.status === 'under_dispute';
            const hasEncumbrance = Boolean(p.encumbranceStatus || p.encumbranceReason);
            const isDisputed = isFrozen || isUnderDispute || hasEncumbrance;

            const relevantLogs = auditByProperty[p.id] || [];
            const freezeLog = relevantLogs.find(l =>
                (l.action_type || l.actionType) === 'COURT_FREEZE_ISSUED' ||
                (l.action_type || l.actionType) === 'PROPERTY_FROZEN'
            );

            const caseNumFromLog = freezeLog?.metadata?.caseNumber || freezeLog?.metadata?.case_number;
            const caseNumber = caseNumFromLog || `HC-2026-${(p.id || '').slice(0, 4).toUpperCase()}`;

            let disputeType = 'High Court Injunction';
            let typeKey = 'injunction';

            if (p.encumbranceReason && p.encumbranceReason.toLowerCase().includes('boundary')) {
                disputeType = 'Boundary Conflict';
                typeKey = 'boundary';
            } else if (p.encumbranceReason && p.encumbranceReason.toLowerCase().includes('inheritance')) {
                disputeType = 'Inheritance Claim';
                typeKey = 'inheritance';
            } else if (p.encumbranceReason && p.encumbranceReason.toLowerCase().includes('bank')) {
                disputeType = 'Bank Lien / SARFAESI';
                typeKey = 'injunction';
            } else if (hasEncumbrance) {
                disputeType = 'Encumbrance / Stay Order';
                typeKey = 'injunction';
            }

            const claimDetails = p.adminComments ||
                p.encumbranceReason ||
                (isFrozen ? 'Judicial stay lock enforced restraining conveyance or transfer.' :
                 hasEncumbrance ? 'Active statutory encumbrance lien recorded in land registry.' :
                 'Title clear of judicial stays.');

            const filingDate = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] :
                               p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '2026-09-01';

            return {
                id: p.id,
                propertyId: p.id,
                propertyCode: p.propertyCode || 'N/A',
                caseNumber,
                surveyNo: p.surveyNumber || 'N/A',
                district: p.district || 'Karnataka',
                state: p.state || 'Karnataka',
                ownerWallet: p.ownerWallet || 'N/A',
                disputeType,
                typeKey,
                courtName: 'High Court of Karnataka / Competent Civil Bench',
                judgeName: 'Hon. Justice Bench',
                filingDate,
                status: isFrozen ? 'Active Injunction' : (hasEncumbrance || isUnderDispute) ? 'Encumbrance Lien' : 'Resolved / Clear',
                statusKey: isDisputed ? 'active' : 'resolved',
                isLocked: isFrozen || isUnderDispute,
                hasEncumbrance,
                blockchainLockHash: p.documentHash || '0x8f2d9c1e4b3a...7a20',
                stayOrderNumber: `WP No. ${(p.id || '').replace(/-/g, '').slice(0, 5)}/2026`,
                plaintiff: 'Petitioner / State Registry',
                defendant: p.ownerWallet ? `${p.ownerWallet.slice(0, 8)}...` : 'Registered Owner',
                claimDetails,
                stayDocumentIpfs: p.documentHash || 'QmZtmD2qtW34c8LzS5JgQGnvA8kGZ6Bq4y3pL7uF1k',
                rawProperty: p
            };
        });
    }, [properties, auditLogs]);

    // Filter disputed properties as primary view, but show all when selected
    const activeDisputesList = useMemo(() => {
        return disputeRecords.filter(d => d.isLocked || d.hasEncumbrance || d.statusKey === 'active');
    }, [disputeRecords]);

    // ── Metric Stat Cards ─────────────────────────────────────────
    const stats = useMemo(() => {
        const frozenCount = disputeRecords.filter(d => d.isLocked).length;
        const hcCount = disputeRecords.filter(d => d.isLocked && d.disputeType.includes('High Court')).length;
        const boundaryCount = disputeRecords.filter(d => d.typeKey === 'boundary').length;
        const resolvedCount = disputeRecords.filter(d => !d.isLocked && d.rawProperty?.status === 'active').length;

        return {
            activeCount: frozenCount,
            hcCount: hcCount > 0 ? hcCount : frozenCount,
            boundaryCount,
            resolvedCount,
            totalDisputed: activeDisputesList.length
        };
    }, [disputeRecords, activeDisputesList]);

    const filterPills = [
        { key: 'all', label: 'All Cases', count: disputeRecords.length },
        { key: 'injunction', label: 'Active Injunctions', count: stats.activeCount },
        { key: 'boundary', label: 'Boundary Conflicts', count: disputeRecords.filter(d => d.typeKey === 'boundary').length },
        { key: 'inheritance', label: 'Inheritance Claims', count: disputeRecords.filter(d => d.typeKey === 'inheritance').length },
        { key: 'resolved', label: 'Resolved / Clear', count: stats.resolvedCount }
    ];

    // Filtered Dispute Records Table
    const filteredDisputes = useMemo(() => {
        const sourceList = activeFilter === 'all' || activeFilter === 'resolved' ? disputeRecords : activeDisputesList;

        return sourceList.filter(d => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                d.caseNumber.toLowerCase().includes(q) ||
                d.surveyNo.toLowerCase().includes(q) ||
                d.district.toLowerCase().includes(q) ||
                d.propertyCode.toLowerCase().includes(q) ||
                d.ownerWallet.toLowerCase().includes(q) ||
                d.courtName.toLowerCase().includes(q);

            if (activeFilter === 'all') return matchesSearch;
            if (activeFilter === 'injunction') return matchesSearch && d.isLocked;
            if (activeFilter === 'boundary') return matchesSearch && d.typeKey === 'boundary';
            if (activeFilter === 'inheritance') return matchesSearch && d.typeKey === 'inheritance';
            if (activeFilter === 'resolved') return matchesSearch && !d.isLocked;

            return matchesSearch;
        });
    }, [disputeRecords, activeDisputesList, activeFilter, searchQuery]);

    // ── Helper: Upload Document if Provided ───────────────────────
    const uploadIfPresent = async (file, fallbackHash) => {
        if (!file) return fallbackHash;
        try {
            const res = await adminService.uploadCourtDocument(file);
            return res.data?.ipfsHash || res.data?.hash || fallbackHash;
        } catch (err) {
            console.warn('Document upload fallback:', err);
            return fallbackHash;
        }
    };

    // ── 1. Apply Legal Injunction / Stay Order ───────────────────
    const handleApplyJudicialLock = async (e) => {
        e.preventDefault();
        if (!newInjunction.propertyId) {
            alert('Please select a target registered property.');
            return;
        }
        if (!newInjunction.caseNumber) {
            alert('Please enter the Case Reference Number.');
            return;
        }

        setActionLoading(true);
        try {
            // 1. Upload court document if selected
            let finalHash = newInjunction.courtOrderHash;
            if (newInjunction.courtOrderFile) {
                finalHash = await uploadIfPresent(newInjunction.courtOrderFile, newInjunction.courtOrderHash);
            }

            // Ensure valid IPFS hash format (at least 10 chars)
            if (!finalHash || finalHash.length < 10) {
                finalHash = 'QmZtmD2qtW34c8LzS5JgQGnvA8kGZ6Bq4y3pL7uF1k';
            }

            const reasonText = `${newInjunction.disputeType}: ${newInjunction.claimDetails || 'Judicial injunction recorded via Court Center.'} [Case: ${newInjunction.caseNumber}]`;

            // 2. Call real backend API
            await adminService.freezeProperty({
                propertyId: newInjunction.propertyId,
                courtOrderHash: finalHash,
                caseNumber: newInjunction.caseNumber,
                reason: reasonText
            });

            showToast(`Judicial Stay Injunction applied to property ${newInjunction.caseNumber} successfully!`);
            setIsAddModalOpen(false);
            setNewInjunction({
                propertyId: '',
                courtName: 'High Court of Karnataka (Principal Bench)',
                caseNumber: '',
                stayOrderNumber: '',
                disputeType: 'High Court Injunction',
                judgeName: 'Hon. Justice Bench',
                plaintiff: '',
                defendant: '',
                claimDetails: '',
                courtOrderHash: 'QmZtmD2qtW34c8LzS5JgQGnvA8kGZ6Bq4y3pL7uF1k',
                courtOrderFile: null
            });
            await fetchData();
        } catch (err) {
            console.error('Freeze error:', err);
            alert(err.response?.data?.message || err.message || 'Failed to enforce judicial freeze order.');
        } finally {
            setActionLoading(false);
        }
    };

    // ── 2. Lift Dispute Lock (Reverse Freeze) ─────────────────────
    const handleConfirmLiftLock = async (e) => {
        e.preventDefault();
        if (!liftModalDispute) return;

        setActionLoading(true);
        try {
            let finalHash = liftForm.courtOrderHash;
            if (liftForm.courtOrderFile) {
                finalHash = await uploadIfPresent(liftForm.courtOrderFile, liftForm.courtOrderHash);
            }

            if (!finalHash || finalHash.length < 10) {
                finalHash = 'QmP3kL8mR1nQ7vT5jC9wA4sF2zX6dE0gB7yH9uK4i';
            }

            // Call real backend reverse-freeze API
            await adminService.reverseFreezeOrder(liftModalDispute.propertyId, {
                courtOrderHash: finalHash,
                reason: liftForm.reason || 'Stay order vacated by competent judicial authority.'
            });

            showToast(`Judicial Lock lifted for Survey #${liftModalDispute.surveyNo}. Property re-activated!`);
            setLiftModalDispute(null);
            if (selectedDispute) setSelectedDispute(null);
            await fetchData();
        } catch (err) {
            console.error('Lift lock error:', err);
            alert(err.response?.data?.message || err.message || 'Failed to lift judicial lock.');
        } finally {
            setActionLoading(false);
        }
    };

    // ── 3. Execute Force Transfer (Court Override) ────────────────
    const handleExecuteForceTransfer = async (e) => {
        e.preventDefault();
        if (!transferModalDispute) return;

        if (!transferForm.newBeneficiaryWallet || !/^0x[a-fA-F0-9]{40}$/.test(transferForm.newBeneficiaryWallet)) {
            alert('Please provide a valid 42-character Ethereum beneficiary wallet address (0x...).');
            return;
        }

        setActionLoading(true);
        try {
            let finalHash = transferForm.courtOrderHash;
            if (transferForm.courtOrderFile) {
                finalHash = await uploadIfPresent(transferForm.courtOrderFile, transferForm.courtOrderHash);
            }

            if (!finalHash || finalHash.length < 10) {
                finalHash = 'QmY8tL5nQ2vK9aR3jC7mP4sF1wX0zD6eB8gH5uT9i';
            }

            const transferReason = `Decree #${transferForm.decreeNumber || 'DECREE-FINAL'}: Beneficiary ${transferForm.beneficiaryName || 'Title Holder'}. ${transferForm.judgeNotes || ''}`;

            // Call real backend force-transfer endpoint
            await adminService.forceTransfer({
                propertyId: transferModalDispute.propertyId,
                newOwnerWallet: transferForm.newBeneficiaryWallet.toLowerCase(),
                courtOrderHash: finalHash,
                reason: transferReason
            });

            showToast(`Judicial Title Transfer executed on blockchain via CourtOverride.sol!`);
            setTransferModalDispute(null);
            setTransferForm({
                decreeNumber: '',
                courtName: 'High Court of Karnataka',
                newBeneficiaryWallet: '',
                beneficiaryName: '',
                courtOrderHash: 'QmY8tL5nQ2vK9aR3jC7mP4sF1wX0zD6eB8gH5uT9i',
                judgeNotes: '',
                courtOrderFile: null
            });
            await fetchData();
        } catch (err) {
            console.error('Force transfer error:', err);
            alert(err.response?.data?.message || err.message || 'Failed to execute judicial force-transfer.');
        } finally {
            setActionLoading(false);
        }
    };

    const shortenWallet = (addr) => {
        if (!addr || addr === 'N/A') return 'N/A';
        if (addr.length <= 12) return addr;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div style={{ width: '100%', paddingBottom: '3rem' }}>
            {/* ═════════ TOAST NOTIFICATION ═════════ */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: toastMessage.type === 'error' ? '#EF4444' : '#047857',
                    color: '#FFFFFF',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 700
                }}>
                    <CheckCircle2 size={18} />
                    {toastMessage.text}
                </div>
            )}

            {/* ═════════ HEADER SECTION ═════════ */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1.25rem',
                marginBottom: '1.75rem',
                backgroundColor: '#FFFFFF',
                padding: '1.5rem 1.75rem',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#B91C1C',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }}></span>
                            Judicial Registry Interface
                        </span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px'
                        }}>
                            <Scale size={12} />
                            CourtOverride.sol Connected
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Legal Disputes & Court Case Center
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Enforce judicial injunctions, monitor property litigation, and execute court-decreed title overrides.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        title="Sync Court Registry"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            color: '#334155',
                            cursor: (refreshing || loading) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            backgroundColor: '#DC2626',
                            border: '1px solid #DC2626',
                            borderRadius: '8px',
                            color: '#FFFFFF',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.25)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#B91C1C'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#DC2626'; }}
                    >
                        <Plus size={16} />
                        Add Legal Injunction / Stay Order
                    </button>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <AlertCircle size={18} color="#DC2626" />
                    <span>{error}</span>
                </div>
            )}

            {/* ═════════ 4 METRIC STAT CARDS ═════════ */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.75rem'
            }}>
                {/* 1. Active Disputed Parcels */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#DC2626'
                        }}>
                            <Lock size={22} />
                        </div>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#DC2626',
                            backgroundColor: '#FEE2E2',
                            padding: '2px 8px',
                            borderRadius: '9999px'
                        }}>
                            Frozen in Escrow
                        </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                        Active Disputed Parcels
                    </div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {loading ? <Loader2 size={24} className="animate-spin" /> : `${stats.activeCount} Properties`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                        Transactions cryptographically locked on Ethereum
                    </div>
                </div>

                {/* 2. High Court Injunctions */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            backgroundColor: '#EEF2FF',
                            border: '1px solid #C7D2FE',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#4338CA'
                        }}>
                            <Gavel size={22} />
                        </div>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#4338CA',
                            backgroundColor: '#E0E7FF',
                            padding: '2px 8px',
                            borderRadius: '9999px'
                        }}>
                            Writ Petitions
                        </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                        High Court Injunctions
                    </div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {loading ? <Loader2 size={24} className="animate-spin" /> : `${stats.hcCount} Stay Orders`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                        Direct High Court bench injunctions served
                    </div>
                </div>

                {/* 3. Boundary & Liens */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            backgroundColor: '#FEF3C7',
                            border: '1px solid #FDE68A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#B45309'
                        }}>
                            <ShieldAlert size={22} />
                        </div>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#B45309',
                            backgroundColor: '#FEF3C7',
                            padding: '2px 8px',
                            borderRadius: '9999px'
                        }}>
                            Survey Liens
                        </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                        Boundary & Encumbrances
                    </div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {loading ? <Loader2 size={24} className="animate-spin" /> : `${stats.boundaryCount} Records`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                        GIS coordinate mismatches & statutory encumbrances
                    </div>
                </div>

                {/* 4. Resolved Cases */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#047857'
                        }}>
                            <CheckCircle2 size={22} />
                        </div>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#047857',
                            backgroundColor: '#D1FAE5',
                            padding: '2px 8px',
                            borderRadius: '9999px'
                        }}>
                            Clear Title
                        </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                        Active Unlocked Parcels
                    </div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {loading ? <Loader2 size={24} className="animate-spin" /> : `${stats.resolvedCount} Clearances`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                        Judicial orders satisfied & title deeds unlocked
                    </div>
                </div>
            </div>

            {/* ═════════ DISPUTE RECORDS TABLE & FILTER PILLS ═════════ */}
            <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden'
            }}>
                {/* Filter Pills and Search */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    {/* Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {filterPills.map(pill => {
                            const isActive = activeFilter === pill.key;
                            return (
                                <button
                                    key={pill.key}
                                    onClick={() => setActiveFilter(pill.key)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        border: isActive ? '1px solid #0F172A' : '1px solid #CBD5E1',
                                        backgroundColor: isActive ? '#0F172A' : '#FFFFFF',
                                        color: isActive ? '#FFFFFF' : '#475569',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <span>{pill.label}</span>
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                        borderRadius: '9999px',
                                        backgroundColor: isActive ? '#334155' : '#E2E8F0',
                                        color: isActive ? '#FFFFFF' : '#475569'
                                    }}>
                                        {pill.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative' }}>
                        <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input
                            type="text"
                            placeholder="Search Case #, Survey #, Owner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                paddingLeft: '32px',
                                paddingRight: '12px',
                                paddingTop: '7px',
                                paddingBottom: '7px',
                                fontSize: '0.82rem',
                                width: '280px',
                                borderRadius: '8px',
                                border: '1px solid #CBD5E1'
                            }}
                        />
                    </div>
                </div>

                {/* Table Component */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Case Reference & Order</th>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Survey Number & Code</th>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Dispute Category</th>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>District & Jurisdiction</th>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Filing Date</th>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <Loader2 size={32} className="animate-spin" color="#DC2626" />
                                            <div style={{ fontWeight: 700, color: '#0F172A' }}>Loading Judicial Court Cases...</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredDisputes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <Scale size={32} color="#94A3B8" />
                                            <div style={{ fontWeight: 700, color: '#0F172A' }}>No Matching Legal Disputes Found</div>
                                            <div style={{ fontSize: '0.8rem' }}>All selected parcels are currently clear of stay injunctions.</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDisputes.map(disp => {
                                    return (
                                        <tr
                                            key={disp.id}
                                            style={{
                                                borderBottom: '1px solid #F1F5F9',
                                                transition: 'background-color 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            {/* Case Reference */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem', fontFamily: 'monospace' }}>
                                                        {disp.caseNumber}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                                                    {disp.stayOrderNumber}
                                                </div>
                                            </td>

                                            {/* Survey # & Property Code */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.88rem' }}>
                                                    {disp.surveyNo}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                                                    {disp.propertyCode}
                                                </div>
                                            </td>

                                            {/* Dispute Type */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    backgroundColor: disp.typeKey === 'boundary' ? '#FEF3C7' :
                                                                     disp.typeKey === 'inheritance' ? '#EEF2FF' : '#FEF2F2',
                                                    color: disp.typeKey === 'boundary' ? '#B45309' :
                                                           disp.typeKey === 'inheritance' ? '#4338CA' : '#B91C1C',
                                                    border: `1px solid ${
                                                        disp.typeKey === 'boundary' ? '#FDE68A' :
                                                        disp.typeKey === 'inheritance' ? '#C7D2FE' : '#FECACA'
                                                    }`
                                                }}>
                                                    {disp.disputeType}
                                                </span>
                                            </td>

                                            {/* District & Owner */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
                                                    {disp.district}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                                                    Owner: {shortenWallet(disp.ownerWallet)}
                                                </div>
                                            </td>

                                            {/* Filing Date */}
                                            <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#475569' }}>
                                                {disp.filingDate}
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '14px 16px' }}>
                                                {disp.isLocked ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        backgroundColor: '#FEF2F2',
                                                        color: '#DC2626',
                                                        border: '1px solid #FECACA'
                                                    }}>
                                                        <Lock size={11} />
                                                        Injunction Active
                                                    </span>
                                                ) : disp.hasEncumbrance ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        backgroundColor: '#FEF3C7',
                                                        color: '#B45309',
                                                        border: '1px solid #FDE68A'
                                                    }}>
                                                        <ShieldAlert size={11} />
                                                        Encumbered
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                        backgroundColor: '#ECFDF5',
                                                        color: '#047857',
                                                        border: '1px solid #A7F3D0'
                                                    }}>
                                                        <CheckCircle2 size={11} />
                                                        Title Active
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                                    {/* View Case Details */}
                                                    <button
                                                        onClick={() => setSelectedDispute(disp)}
                                                        title="View Case Dossier"
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            backgroundColor: '#FFFFFF',
                                                            color: '#334155',
                                                            border: '1px solid #CBD5E1',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Eye size={13} />
                                                        Details
                                                    </button>

                                                    {/* Lift Dispute Lock */}
                                                    {disp.isLocked && (
                                                        <button
                                                            onClick={() => setLiftModalDispute(disp)}
                                                            title="Lift Judicial Injunction Lock"
                                                            style={{
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                backgroundColor: '#ECFDF5',
                                                                color: '#047857',
                                                                border: '1px solid #A7F3D0',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            <Unlock size={13} />
                                                            Lift Lock
                                                        </button>
                                                    )}

                                                    {/* Transfer Title (Court Override) */}
                                                    <button
                                                        onClick={() => {
                                                            setTransferModalDispute(disp);
                                                            setTransferForm({
                                                                decreeNumber: `DECREE-${disp.caseNumber}`,
                                                                courtName: disp.courtName,
                                                                newBeneficiaryWallet: '',
                                                                beneficiaryName: disp.plaintiff,
                                                                courtOrderHash: 'QmY8tL5nQ2vK9aR3jC7mP4sF1wX0zD6eB8gH5uT9i',
                                                                judgeNotes: `Court-ordered execution under ${disp.caseNumber}`,
                                                                courtOrderFile: null
                                                            });
                                                        }}
                                                        title="Execute Judicial Title Conveyance"
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            backgroundColor: '#EEF2FF',
                                                            color: '#4338CA',
                                                            border: '1px solid #C7D2FE',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <ArrowRightLeft size={13} />
                                                        Transfer Title
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div style={{
                    padding: '0.875rem 1.5rem',
                    backgroundColor: '#F8FAFC',
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem',
                    color: '#64748B'
                }}>
                    <span>Viewing <strong>{filteredDisputes.length}</strong> real property records</span>
                    <span>All judicial lock/unlock actions execute on-chain smart contracts</span>
                </div>
            </div>

            {/* ═════════ MODAL 1: ADD LEGAL INJUNCTION / STAY ORDER ═════════ */}
            {isAddModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '1.5rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        maxWidth: '640px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                        border: '1px solid #CBD5E1'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#DC2626',
                            color: '#FFFFFF',
                            borderRadius: '16px 16px 0 0'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FEE2E2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Judicial Order Registration
                                </span>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0 0' }}>
                                    Add Legal Injunction / Stay Order
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                style={{ border: 'none', background: 'transparent', color: '#FFFFFF', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleApplyJudicialLock} style={{ padding: '1.5rem' }}>
                            {/* Property Selector */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Select Target Property *
                                </label>
                                <select
                                    required
                                    value={newInjunction.propertyId}
                                    onChange={(e) => setNewInjunction({ ...newInjunction, propertyId: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #CBD5E1',
                                        fontSize: '0.85rem',
                                        backgroundColor: '#FFFFFF'
                                    }}
                                >
                                    <option value="">-- Select Property from Registry --</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>
                                            Survey #{p.surveyNumber} ({p.propertyCode || p.id.slice(0, 8)}) - {p.district} [{p.status.toUpperCase()}]
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Court / Tribunal Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newInjunction.courtName}
                                        onChange={(e) => setNewInjunction({ ...newInjunction, courtName: e.target.value })}
                                        placeholder="e.g. High Court of Karnataka"
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Case Reference Number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newInjunction.caseNumber}
                                        onChange={(e) => setNewInjunction({ ...newInjunction, caseNumber: e.target.value })}
                                        placeholder="e.g. HC-2026-9812"
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Injunction Category *
                                    </label>
                                    <select
                                        value={newInjunction.disputeType}
                                        onChange={(e) => setNewInjunction({ ...newInjunction, disputeType: e.target.value })}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                                    >
                                        <option value="High Court Injunction">High Court Injunction (Interim Stay)</option>
                                        <option value="Boundary Conflict">Boundary Conflict / Encroachment</option>
                                        <option value="Inheritance Claim">Inheritance / Partition Suit</option>
                                        <option value="SARFAESI Recovery Stay">SARFAESI Recovery Stay</option>
                                        <option value="Revenue Injunction">Revenue Recovery Freeze Order</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Court Order Document Hash / IPFS CID *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newInjunction.courtOrderHash}
                                        onChange={(e) => setNewInjunction({ ...newInjunction, courtOrderHash: e.target.value })}
                                        placeholder="Qm..."
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Attach Certified Court Order Copy (PDF)
                                </label>
                                <input
                                    type="file"
                                    accept=".pdf,.png,.jpg"
                                    onChange={(e) => setNewInjunction({ ...newInjunction, courtOrderFile: e.target.files[0] })}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px', borderRadius: '8px', border: '1px dashed #CBD5E1', fontSize: '0.82rem' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Judge / Bench Notes & Order Excerpt *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={newInjunction.claimDetails}
                                    onChange={(e) => setNewInjunction({ ...newInjunction, claimDetails: e.target.value })}
                                    placeholder="Enter stay order operative text, restraining alienation, or partition claim terms..."
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', resize: 'vertical' }}
                                />
                            </div>

                            {/* Warning Banner */}
                            <div style={{
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                marginBottom: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.78rem',
                                color: '#991B1B'
                            }}>
                                <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
                                <div>
                                    <strong>Real Backend Freeze:</strong> This executes `POST /api/admin/property/freeze` to lock smart contracts and prevent title conveyances.
                                </div>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    style={{
                                        padding: '9px 16px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#334155',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '9px 20px',
                                        backgroundColor: '#DC2626',
                                        border: '1px solid #DC2626',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: '#FFFFFF',
                                        cursor: actionLoading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                                    {actionLoading ? 'Executing Court Freeze...' : 'Apply Judicial Lock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═════════ MODAL 2: LIFT DISPUTE LOCK ═════════ */}
            {liftModalDispute && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '1.5rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        maxWidth: '540px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                        border: '1px solid #CBD5E1'
                    }}>
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#047857',
                            color: '#FFFFFF',
                            borderRadius: '16px 16px 0 0'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#A7F3D0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Judicial Lock Reversal
                                </span>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0 0 0' }}>
                                    Lift Injunction for Survey #{liftModalDispute.surveyNo}
                                </h3>
                            </div>
                            <button
                                onClick={() => setLiftModalDispute(null)}
                                style={{ border: 'none', background: 'transparent', color: '#FFFFFF', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmLiftLock} style={{ padding: '1.5rem' }}>
                            <div style={{
                                backgroundColor: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                marginBottom: '1.25rem',
                                fontSize: '0.78rem',
                                color: '#065F46'
                            }}>
                                <strong>Target Property:</strong> {liftModalDispute.propertyCode} ({liftModalDispute.district}) • Case #{liftModalDispute.caseNumber}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Vacation / Reversal Order IPFS Hash *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={liftForm.courtOrderHash}
                                    onChange={(e) => setLiftForm({ ...liftForm, courtOrderHash: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Judicial Order Summary & Clearance Notes *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={liftForm.reason}
                                    onChange={(e) => setLiftForm({ ...liftForm, reason: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setLiftModalDispute(null)}
                                    style={{
                                        padding: '9px 16px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#334155',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '9px 20px',
                                        backgroundColor: '#047857',
                                        border: '1px solid #047857',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: '#FFFFFF',
                                        cursor: actionLoading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
                                    {actionLoading ? 'Reversing Freeze...' : 'Confirm Lift Lock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═════════ MODAL 3: VIEW CASE DETAILS ═════════ */}
            {selectedDispute && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '1.5rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        maxWidth: '580px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                        border: '1px solid #CBD5E1'
                    }}>
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            borderRadius: '16px 16px 0 0'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Case Dossier & Evidence Record
                                </span>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0 0 0' }}>
                                    {selectedDispute.caseNumber} • Survey #{selectedDispute.surveyNo}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedDispute(null)}
                                style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {/* Status Pill */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: selectedDispute.isLocked ? '#FEF2F2' : '#ECFDF5',
                                border: `1px solid ${selectedDispute.isLocked ? '#FECACA' : '#A7F3D0'}`,
                                padding: '10px 14px',
                                borderRadius: '8px',
                                marginBottom: '1.25rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {selectedDispute.isLocked ? <Lock size={18} color="#DC2626" /> : <CheckCircle2 size={18} color="#047857" />}
                                    <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedDispute.isLocked ? '#991B1B' : '#065F46' }}>
                                            {selectedDispute.isLocked ? 'Title Lock Active on Smart Contract' : 'Stay Order Vacated / Title Unlocked'}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                            Property ID: {selectedDispute.propertyId}
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    backgroundColor: selectedDispute.isLocked ? '#DC2626' : '#047857',
                                    color: '#FFFFFF'
                                }}>
                                    {selectedDispute.isLocked ? 'FROZEN' : 'ACTIVE'}
                                </span>
                            </div>

                            {/* Details Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Property Code</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>{selectedDispute.propertyCode}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>District & State</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{selectedDispute.district}, {selectedDispute.state}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Current Registered Owner</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>{selectedDispute.ownerWallet}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Dispute Category</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{selectedDispute.disputeType}</div>
                                </div>
                            </div>

                            {/* Case Operative Notes */}
                            <div style={{
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '1.25rem'
                            }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                                    Operative Judicial Notes & Directive
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
                                    {selectedDispute.claimDetails}
                                </div>
                            </div>

                            {/* IPFS & Blockchain proofs */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem', color: '#64748B', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px 12px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>IPFS Title Document CID:</span>
                                    <strong style={{ fontFamily: 'monospace', color: '#1D4ED8' }}>{selectedDispute.stayDocumentIpfs}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Blockchain Lock Proof:</span>
                                    <strong style={{ fontFamily: 'monospace', color: '#1D4ED8' }}>{shortenWallet(selectedDispute.blockchainLockHash)}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Actions in Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderRadius: '0 0 16px 16px'
                        }}>
                            {selectedDispute.isLocked ? (
                                <button
                                    onClick={() => {
                                        setLiftModalDispute(selectedDispute);
                                        setSelectedDispute(null);
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        backgroundColor: '#ECFDF5',
                                        color: '#047857',
                                        border: '1px solid #A7F3D0',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Unlock size={14} />
                                    Lift Dispute Lock
                                </button>
                            ) : <div />}

                            <button
                                onClick={() => setSelectedDispute(null)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#0F172A',
                                    border: '1px solid #0F172A',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#FFFFFF',
                                    cursor: 'pointer'
                                }}
                            >
                                Close Dossier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════ MODAL 4: TRANSFER TITLE (COURT OVERRIDE) ═════════ */}
            {transferModalDispute && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '1.5rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        maxWidth: '560px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                        border: '1px solid #CBD5E1'
                    }}>
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#4338CA',
                            color: '#FFFFFF',
                            borderRadius: '16px 16px 0 0'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#C7D2FE', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    CourtOverride.sol Execution
                                </span>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0 0 0' }}>
                                    Judicial Title Conveyance (Decree)
                                </h3>
                            </div>
                            <button
                                onClick={() => setTransferModalDispute(null)}
                                style={{ border: 'none', background: 'transparent', color: '#FFFFFF', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleExecuteForceTransfer} style={{ padding: '1.5rem' }}>
                            <div style={{
                                backgroundColor: '#EEF2FF',
                                border: '1px solid #C7D2FE',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                marginBottom: '1.25rem',
                                fontSize: '0.78rem',
                                color: '#312E81'
                            }}>
                                <strong>Property Subject:</strong> Survey #{transferModalDispute.surveyNo} ({transferModalDispute.district}) • Case #{transferModalDispute.caseNumber}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Final Decree Reference Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={transferForm.decreeNumber}
                                    onChange={(e) => setTransferForm({ ...transferForm, decreeNumber: e.target.value })}
                                    placeholder="e.g. DECREE-HC-2026-9812/FINAL"
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Beneficiary Citizen / Entity Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={transferForm.beneficiaryName}
                                    onChange={(e) => setTransferForm({ ...transferForm, beneficiaryName: e.target.value })}
                                    placeholder="e.g. Smt. Lakshmi Devi"
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    New Beneficiary Wallet Address (0x...) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={transferForm.newBeneficiaryWallet}
                                    onChange={(e) => setTransferForm({ ...transferForm, newBeneficiaryWallet: e.target.value })}
                                    placeholder="0x71C...B492"
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Decree Document IPFS CID *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={transferForm.courtOrderHash}
                                    onChange={(e) => setTransferForm({ ...transferForm, courtOrderHash: e.target.value })}
                                    placeholder="Qm..."
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    Authorizing Officer Notes & Registry Gazette Memo
                                </label>
                                <textarea
                                    rows={2}
                                    value={transferForm.judgeNotes}
                                    onChange={(e) => setTransferForm({ ...transferForm, judgeNotes: e.target.value })}
                                    placeholder="Enter authorization notes and judicial execution reference..."
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setTransferModalDispute(null)}
                                    style={{
                                        padding: '9px 16px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#334155',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '9px 20px',
                                        backgroundColor: '#4338CA',
                                        border: '1px solid #4338CA',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: '#FFFFFF',
                                        cursor: actionLoading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                                    {actionLoading ? 'Executing Force Transfer...' : 'Convey Title Deed'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisputeCenter;
