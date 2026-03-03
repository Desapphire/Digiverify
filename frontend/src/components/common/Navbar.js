import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Home, User, Shield, Wallet } from 'lucide-react';
import Button from './Button';
import { useWeb3 } from '../../context/Web3Context';

const Navbar = ({ onLogout }) => {
    const navigate = useNavigate();
    const { account, connectWallet, isConnecting } = useWeb3();

    const handleLogout = () => {
        localStorage.removeItem('token');
        if (onLogout) onLogout();
        navigate('/login');
    };

    return (
        <nav className="glass-panel" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            marginBottom: '2rem',
            position: 'sticky',
            top: '1rem',
            zIndex: 100
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={28} color="var(--primary)" />
                <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                    DigiVerify
                </h2>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <Link to="/dashboard" style={{ color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    <Home size={18} /> Dashboard
                </Link>
                <Link to="/properties" style={{ color: 'var(--text-main)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    <User size={18} /> My Properties
                </Link>

                {account ? (
                    <div className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem' }}>
                        <Wallet size={16} />
                        {account.slice(0, 6)}...{account.slice(-4)}
                    </div>
                ) : (
                    <Button
                        variant="primary"
                        onClick={connectWallet}
                        disabled={isConnecting}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Wallet size={16} />
                        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </Button>
                )}

                <Button variant="outline" onClick={handleLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    <LogOut size={16} /> Logout
                </Button>
            </div>
        </nav>
    );
};

export default Navbar;
