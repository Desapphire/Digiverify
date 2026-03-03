import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Landmark } from 'lucide-react';

const BankDashboard = () => {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Landmark size={36} color="var(--primary)" />
                <h1 className="text-gradient" style={{ margin: 0 }}>Bank Operations Portal</h1>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Manage ASBA-style property fund blocking and release mechanisms for active property sale contracts.
            </p>

            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Pending Fund Block Requests</h3>
                </div>

                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <p>No pending fund-block requests from buyers at this moment.</p>
                </div>
            </Card>

            <Card style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Active Fund Blocks (Awaiting Authority Clearance)</h3>
                </div>

                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <p>No active fund blocks waiting for final property transfer settlement.</p>
                </div>
            </Card>
        </div>
    );
};

export default BankDashboard;
