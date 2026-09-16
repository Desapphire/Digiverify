import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext(null);

const getEthereumProvider = () => {
    try {
        if (typeof window === 'undefined') return null;
        if (window.ethereum?.providers?.length) {
            const metaMask = window.ethereum.providers.find((p) => p.isMetaMask && !p.isBraveWallet);
            return metaMask || window.ethereum.providers[0];
        }
        return window.ethereum || null;
    } catch (_) {
        return null;
    }
};

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState('');
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [chainId, setChainId] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const eth = getEthereumProvider();
        if (!eth) return;

        const checkConnection = async () => {
            try {
                const accounts = await eth.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    const web3Provider = new ethers.BrowserProvider(eth);
                    const web3Signer = await web3Provider.getSigner();
                    const network = await web3Provider.getNetwork();

                    setAccount(accounts[0]);
                    setProvider(web3Provider);
                    setSigner(web3Signer);
                    setChainId(Number(network.chainId));
                }
            } catch (err) {
                console.warn('Auto-connect check skipped:', err);
            }
        };

        checkConnection();

        const handleAccountsChanged = (accounts) => {
            if (accounts && accounts.length > 0) {
                setAccount(accounts[0]);
            } else {
                setAccount('');
                setSigner(null);
            }
        };

        const handleChainChanged = (chainIdHex) => {
            setChainId(parseInt(chainIdHex, 16));
        };

        try {
            if (typeof eth.on === 'function') {
                eth.on('accountsChanged', handleAccountsChanged);
                eth.on('chainChanged', handleChainChanged);
            }
        } catch (eventErr) {
            console.warn('Could not register ethereum event listeners:', eventErr);
        }

        return () => {
            try {
                if (typeof eth.removeListener === 'function') {
                    eth.removeListener('accountsChanged', handleAccountsChanged);
                    eth.removeListener('chainChanged', handleChainChanged);
                }
            } catch (_) {}
        };
    }, []);

    const connectWallet = async () => {
        const eth = getEthereumProvider();
        if (!eth) {
            setError('Please install MetaMask to use Web3 features.');
            throw new Error('MetaMask not installed');
        }

        try {
            setIsConnecting(true);
            setError('');

            // Request account access
            const accounts = await eth.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error('No Ethereum account selected.');
            }

            // Re-initialize provider
            const web3Provider = new ethers.BrowserProvider(eth);
            const web3Signer = await web3Provider.getSigner();
            const network = await web3Provider.getNetwork();

            setAccount(accounts[0]);
            setProvider(web3Provider);
            setSigner(web3Signer);
            setChainId(Number(network.chainId));

            return accounts[0];
        } catch (err) {
            console.error('Connection error:', err);
            let errorMessage = err.message || 'Failed to connect wallet';
            if (err.code === 4001 || err.info?.error?.code === 4001) {
                errorMessage = 'Connection request was rejected in MetaMask.';
            } else if (err.code === -32002) {
                errorMessage = 'MetaMask request is already pending. Please check the MetaMask extension popup in your browser toolbar.';
            }
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsConnecting(false);
        }
    };

    const signMessage = async (message) => {
        let currentSigner = signer;
        const eth = getEthereumProvider();
        if (!currentSigner && eth) {
            const web3Provider = new ethers.BrowserProvider(eth);
            currentSigner = await web3Provider.getSigner();
            setSigner(currentSigner);
        }
        if (!currentSigner) throw new Error("Wallet not connected. Please connect MetaMask.");
        return await currentSigner.signMessage(message);
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
