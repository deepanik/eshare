import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Web3ReactProvider, useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';

const injected = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42, 56, 97], // Add the chain IDs you want to support
});

const Web3Context = createContext();

export function Web3Provider({ children }) {
  return (
    <Web3ReactProvider getLibrary={(provider) => new ethers.providers.Web3Provider(provider)}>
      <Web3ContextProvider>{children}</Web3ContextProvider>
    </Web3ReactProvider>
  );
}

function Web3ContextProvider({ children }) {
  const { active, account, activate, deactivate } = useWeb3React();
  const [isLoading, setIsLoading] = useState(false);

  const connect = async () => {
    try {
      setIsLoading(true);
      await activate(injected);
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    try {
      deactivate();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <Web3Context.Provider
      value={{
        active,
        account,
        connect,
        disconnect,
        isLoading,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
} 