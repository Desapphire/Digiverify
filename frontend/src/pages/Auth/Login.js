import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Shield, Wallet } from 'lucide-react';
import { useWeb3 } from '../../context/Web3Context';

const Login = ({ setAuth }) => {
    const { account, signer, connectWallet, isConnecting } = useWeb3();
    const [loginMethod, setLoginMethod] = useState('wallet'); // 'wallet' or 'password'
    const [walletAddress, setWalletAddress] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    React.useEffect(() => {
        if (account) {
            setWalletAddress(account);
        }
    }, [account]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (loginMethod === 'wallet') {
                if (!account || !signer) {
                    throw new Error('Please connect your MetaMask wallet first.');
                }

                // 1. Get nonce and signing message
                const { data: nonceResponse } = await authService.getNonce(walletAddress);
                const messageToSign = nonceResponse.data.message;

                if (!messageToSign) {
                    throw new Error('Failed to fetch signing message from server.');
                }

                // 2. Sign message using real MetaMask
                const signature = await signer.signMessage(messageToSign);

                // 3. Verify on backend
                const { data } = await authService.verifySignature({ walletAddress, signature });

                localStorage.setItem('token', data.data.accessToken || data.token); // Handle token structure safely
                localStorage.setItem('user', JSON.stringify(data.data.user || data.user));
            } else {
                // Password Login Fallback
                if (!email || !password) {
                    throw new Error('Please enter both email and password.');
                }

                const { data } = await authService.loginWithPassword({ email, password });

                localStorage.setItem('token', data.data.accessToken || data.token);
                localStorage.setItem('user', JSON.stringify(data.data.user || data.user));
            }

            if (setAuth) setAuth(true);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            if (err.code === 'ACTION_REJECTED') {
                setError('Wallet signature was rejected by user.');
            } else {
                setError(err.response?.data?.message || err.message || 'Login failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <Card style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Shield size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h2 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Welcome Back</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>Connect your wallet to access the decentralized property registry.</p>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', width: '100%' }}>
                    <Button
                        type="button"
                        variant={loginMethod === 'wallet' ? 'primary' : 'outline'}
                        style={{ flex: 1 }}
                        onClick={() => { setLoginMethod('wallet'); setError(''); }}
                    >
                        Wallet
                    </Button>
                    <Button
                        type="button"
                        variant={loginMethod === 'password' ? 'primary' : 'outline'}
                        style={{ flex: 1 }}
                        onClick={() => { setLoginMethod('password'); setError(''); }}
                    >
                        Email / Password
                    </Button>
                </div>

                <form onSubmit={handleLogin} style={{ width: '100%' }}>
                    {loginMethod === 'wallet' ? (
                        <>
                            {!account && (
                                <div style={{ marginBottom: '1rem', width: '100%' }}>
                                    <Button type="button" variant="outline" onClick={connectWallet} disabled={isConnecting} style={{ width: '100%' }}>
                                        <Wallet size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                        {isConnecting ? 'Connecting...' : 'Connect MetaMask First'}
                                    </Button>
                                </div>
                            )}

                            <Input
                                label="Wallet Address"
                                placeholder="Connect your wallet first..."
                                value={walletAddress}
                                readOnly
                            />
                        </>
                    ) : (
                        <>
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <div style={{ textAlign: 'right', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                                <Link to="/recovery" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lost wallet? Request Recovery Here.</Link>
                            </div>
                        </>
                    )}

                    {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                    <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Logging in...' : (loginMethod === 'wallet' ? 'Sign via Wallet' : 'Login')}
                    </Button>
                </form>

                <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Register</Link>
                </div>
            </Card>
        </div>
    );
};

export default Login;
