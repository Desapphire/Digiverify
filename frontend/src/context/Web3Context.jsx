import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext(null);

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState('');
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [chainId, setChainId] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (window.ethereum) {
            const checkConnection = async () => {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        await connectWallet();
                    }
                } catch (err) {
                    console.error('Auto-connect check failed:', err);
                }
            };
            checkConnection();

            const handleAccountsChanged = (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                } else {
                    setAccount('');
                }
            };

            const handleChainChanged = (chainIdHex) => {
                setChainId(parseInt(chainIdHex, 16));
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, []);

    const connectWallet = async () => {
        if (!window.ethereum) {
            setError('Please install MetaMask to use Web3 features.');
            throw new Error('MetaMask not installed');
        }

        try {
            setIsConnecting(true);
            setError('');

            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

            // Re-initialize provider
            const web3Provider = new ethers.BrowserProvider(window.ethereum);
            const web3Signer = await web3Provider.getSigner();
            const network = await web3Provider.getNetwork();

            setAccount(accounts[0]);
            setProvider(web3Provider);
            setSigner(web3Signer);
            setChainId(Number(network.chainId));

            return accounts[0];
        } catch (err) {
            console.error('Connection error:', err);
            const errorMessage = err.message || 'Failed to connect wallet';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsConnecting(false);
        }
    };

    const signMessage = async (message) => {
        if (!signer) throw new Error("Wallet not connected");
        return await signer.signMessage(message);
    };

    return (
        <Web3Context.Provider value={{
            account,
            provider,
            signer,
            chainId,
            isConnecting,
            error,
            connectWallet,
            signMessage
        }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => useContext(Web3Context);
