import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext();

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    const connectWallet = async () => {
        setIsConnecting(true);
        setError(null);
        try {
            if (!window.ethereum) {
                throw new Error("MetaMask is not installed. Please install it to use this app.");
            }

            const web3Provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await web3Provider.send("eth_requestAccounts", []);

            if (accounts.length > 0) {
                const web3Signer = await web3Provider.getSigner();
                const network = await web3Provider.getNetwork();

                setProvider(web3Provider);
                setSigner(web3Signer);
                setAccount(accounts[0]);
                setChainId(network.chainId);
            }
        } catch (err) {
            console.error("Wallet connection failed:", err);
            setError(err.message || "Failed to connect wallet.");
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setSigner(null);
        // Provider is kept so we can still read chain state if needed
    };

    const handleAccountsChanged = useCallback((accounts) => {
        if (accounts.length === 0) {
            // MetaMask is locked or the user has not connected any accounts
            disconnectWallet();
        } else {
            // Reload page on account change to ensure clean state
            window.location.reload();
        }
    }, []);

    const handleChainChanged = useCallback(() => {
        window.location.reload();
    }, []);

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            // Check if already connected on load
            const checkConnection = async () => {
                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await web3Provider.send("eth_accounts", []);
                if (accounts.length > 0) {
                    const web3Signer = await web3Provider.getSigner();
                    const network = await web3Provider.getNetwork();
                    setProvider(web3Provider);
                    setSigner(web3Signer);
                    setAccount(accounts[0]);
                    setChainId(network.chainId);
                }
            };

            checkConnection();

            return () => {
                if (window.ethereum?.removeListener) {
                    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                    window.ethereum.removeListener('chainChanged', handleChainChanged);
                }
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const signMessage = async (message) => {
        if (!signer) throw new Error("No signer available. Connect wallet first.");
        return await signer.signMessage(message);
    };

    return (
        <Web3Context.Provider
            value={{
                account,
                provider,
                signer,
                chainId,
                isConnecting,
                error,
                connectWallet,
                disconnectWallet,
                signMessage,
            }}
        >
            {children}
        </Web3Context.Provider>
    );
};
