import React, { useState } from 'react';
import { walletService } from '../../services/wallet.service';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { KeyRound } from 'lucide-react';

const WalletRecovery = () => {
    const [formData, setFormData] = useState({
        oldWalletAddress: '',
        newWalletAddress: '',
        identityDocument: 'passport_123'
    });
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });
        try {
            await walletService.requestRecovery(formData);
            setStatus({ type: 'success', message: 'Recovery request submitted to authorities.' });
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to submit request.' });
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <Card style={{ width: '100%', maxWidth: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <KeyRound size={32} color="var(--warning)" />
                    <h2 style={{ margin: 0 }}>Wallet Recovery</h2>
                </div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    Lost access to your wallet? Request a secure ownership transfer by providing your old wallet, your new wallet, and identity verification.
                </p>

                <form onSubmit={handleSubmit}>
                    <Input
                        label="Old Wallet Address"
                        name="oldWalletAddress"
                        placeholder="0x..."
                        value={formData.oldWalletAddress}
                        onChange={(e) => setFormData({ ...formData, oldWalletAddress: e.target.value })}
                        required
                    />
                    <Input
                        label="New Wallet Address"
                        name="newWalletAddress"
                        placeholder="0x..."
                        value={formData.newWalletAddress}
                        onChange={(e) => setFormData({ ...formData, newWalletAddress: e.target.value })}
                        required
                    />
                    <Input
                        label="Identity Document Reference"
                        name="identityDocument"
                        value={formData.identityDocument}
                        onChange={(e) => setFormData({ ...formData, identityDocument: e.target.value })}
                        required
                    />

                    {status.message && (
                        <div style={{
                            color: status.type === 'error' ? 'var(--danger)' : 'var(--accent)',
                            marginBottom: '1rem',
                            fontSize: '0.9rem',
                            padding: '0.75rem',
                            background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '8px'
                        }}>
                            {status.message}
                        </div>
                    )}

                    <Button type="submit" style={{ width: '100%' }}>Submit Recovery Request</Button>
                </form>
            </Card>
        </div>
    );
};

export default WalletRecovery;
