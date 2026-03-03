import React, { useState, useEffect } from 'react';
import { authorityService } from '../../services/authority.service';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { CheckSquare, XSquare, ShieldAlert } from 'lucide-react';

const AuthorityDashboard = () => {
    const [activeTab, setActiveTab] = useState('properties');

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <ShieldAlert size={36} color="var(--accent)" />
                <h1 className="text-gradient" style={{ margin: 0 }}>Authority Portal</h1>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <Button
                    variant={activeTab === 'properties' ? 'primary' : 'outline'}
                    onClick={() => setActiveTab('properties')}
                >
                    Property Approvals
                </Button>
                <Button
                    variant={activeTab === 'sales' ? 'primary' : 'outline'}
                    onClick={() => setActiveTab('sales')}
                >
                    Sale Approvals
                </Button>
                <Button
                    variant={activeTab === 'recoveries' ? 'primary' : 'outline'}
                    onClick={() => setActiveTab('recoveries')}
                >
                    Wallet Recoveries
                </Button>
            </div>

            <Card>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    {activeTab === 'properties' && (
                        <p>No pending property registrations requiring your approval.</p>
                    )}
                    {activeTab === 'sales' && (
                        <p>No active property sale contracts awaiting final authority clearance.</p>
                    )}
                    {activeTab === 'recoveries' && (
                        <p>No pending wallet recovery/identity verification requests.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default AuthorityDashboard;
