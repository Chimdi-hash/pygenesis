'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export default function PyGenesisVault() {
  const [reportUrl, setReportUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txMessage, setTxMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  
  // Wallet & Client State
  const [account, setAccount] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [tvlBalance, setTvlBalance] = useState<number | null>(null);
  const [readClient, setReadClient] = useState<any>(null);
  const [writeClient, setWriteClient] = useState<any>(null);

  // PLACEHOLDER CONTRACT ADDRESS - User will provide the actual address
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x129d6495D89aDf3E85C9073B16532f12195a7457";

  // Initialize Read Client on Mount
  useEffect(() => {
    const rc = createClient({
      chain: studionet,
    });
    setReadClient(rc);
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!account) return;
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = (window as any).ethereum;
        const balanceWei = await provider.request({ method: 'eth_getBalance', params: [account, "latest"] });
        const balanceGen = parseInt(balanceWei, 16) / 1e18;
        setWalletBalance(balanceGen);
      }
    } catch (err) {
      console.error("Failed to fetch balance", err);
    }
  }, [account]);

  const fetchTvl = useCallback(async () => {
    if (contractAddress === "0x_PENDING_DEPLOYMENT") return;
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = (window as any).ethereum;
        const balanceWei = await provider.request({ method: 'eth_getBalance', params: [contractAddress, "latest"] });
        const balanceGen = parseInt(balanceWei, 16) / 1e18;
        setTvlBalance(balanceGen);
      }
    } catch (err) {
      console.error("Failed to fetch TVL", err);
    }
  }, [contractAddress]);

  const fetchSubmissions = useCallback(async (isBackground = false) => {
    if (!readClient || contractAddress === "0x_PENDING_DEPLOYMENT") return;
    if (!isBackground && submissions.length === 0) setIsLoading(true);
    
    try {
      const fetched = [];
      let i = 0;
      while (true) {
        try {
          const subStr = await readClient.readContract({
             address: contractAddress,
             functionName: 'get_submission',
             args: [i]
          });
          const sub = JSON.parse(subStr as string);
          fetched.unshift(sub); // Add to beginning (newest first)
          i++;
        } catch (e) {
          // When it throws, we have reached the end of the submissions list
          break;
        }
      }
      setSubmissions(fetched);
    } catch (err) {
      console.error("Failed to fetch submissions. Ensure contract address is correct.", err);
    }
    setIsLoading(false);
  }, [readClient, contractAddress, submissions.length]);

  // Polling Effect
  useEffect(() => {
    if (readClient && contractAddress !== "0x_PENDING_DEPLOYMENT") {
      fetchSubmissions();
      fetchTvl();
      if (account) fetchBalance();
      
      const interval = setInterval(() => {
        fetchSubmissions(true);
        fetchTvl();
        if (account) fetchBalance();
      }, 30000); // 30 second polling to prevent RPC rate limits
      return () => clearInterval(interval);
    }
  }, [readClient, contractAddress, account, fetchSubmissions, fetchBalance, fetchTvl]);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const provider = (window as any).ethereum;
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        setAccount(address);
        
        const wc = createClient({
          chain: studionet,
          account: address,
          provider: provider,
        });
        
        await wc.connect("studionet");
        setWriteClient(wc);
        fetchBalance();
      } catch (err) {
        console.error("Failed to connect wallet", err);
        alert("Failed to connect wallet.");
      }
    } else {
      alert("Please install a Web3 wallet like MetaMask.");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setWriteClient(null);
    setWalletBalance(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportUrl || !writeClient) return;
    
    if (contractAddress === "0x_PENDING_DEPLOYMENT") {
      setTxMessage({ type: 'error', text: "Contract not yet deployed. Please update the contract address in the code." });
      return;
    }

    try {
      setIsLoading(true);
      setTxMessage({ type: 'info', text: "Please confirm the 1 GEN transaction in your wallet..." });
      
      const txHash = await writeClient.writeContract({
        address: contractAddress,
        functionName: 'submit_vulnerability',
        args: [reportUrl],
        value: BigInt("1000000000000000000"), // 1 GEN Stake
      });
      
      setTxMessage({ type: 'success', text: `Transaction Sent! GenVM validators are now reaching AI consensus...` });
      setReportUrl('');
      
      // Clear success message after 10 seconds
      setTimeout(() => setTxMessage(null), 10000);
      
    } catch (error) {
      console.error(error);
      setTxMessage({ type: 'error', text: "Transaction failed or was rejected." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container">
      <header className="header floating-element">
        <div>
          <h1 className="title">PyGenesis Sec.</h1>
          <p>Autonomous Bug Bounty Vault</p>
        </div>
        <div>
          {!account ? (
            <button className="btn" onClick={connectWallet}>Connect Wallet</button>
          ) : (
            <div className="wallet-container">
              <div className="wallet-info">
                <div style={{ fontWeight: 'bold', color: '#2ed573' }}>
                  {walletBalance !== null ? `${walletBalance.toFixed(2)} GEN` : '...'}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              </div>
              <button className="btn" style={{ border: '1px solid #ff4757', color: '#ff4757' }} onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="grid">
        {/* Vault Stats */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '1rem' }}>Vault Statistics</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
              <span style={{ display: 'block', fontSize: '0.9rem', opacity: 0.8 }}>Total Value Locked</span>
              <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {tvlBalance !== null ? `${tvlBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GEN` : '...'}
              </span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>Dynamic Bounty Rewards</h3>
              <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2ed573' }}>
                Up to 20.0 GEN
              </p>
            </div>
          </div>
        </div>

        {/* Submit Vulnerability */}
        <div className="glass-card" style={{ animationDelay: '0.2s' }}>
          <h2 style={{ marginBottom: '1rem' }}>Submit Vulnerability</h2>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
            Submit a public URL (e.g. GitHub Gist) containing your Proof-of-Concept. <br/><br/>
            <strong style={{ color: '#ff4757' }}>⚠️ Requires a 1 GEN stake.</strong> If the AI rules your report is valid, you receive your stake back + 4 GEN reward. If your report is spam/invalid, your stake is burned.
          </p>
          
          <form onSubmit={handleSubmit}>
            <input 
              type="url" 
              className="input-field" 
              placeholder="https://gist.github.com/..." 
              value={reportUrl}
              onChange={(e) => setReportUrl(e.target.value)}
              required
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', opacity: !account ? 0.5 : 1 }}
              disabled={isLoading || !account}
            >
              {isLoading ? 'Processing...' : 'Stake 1 GEN & Submit'}
            </button>
            {!account && <p style={{ fontSize: '0.8rem', color: '#ff4757', marginTop: '0.5rem', textAlign: 'center' }}>Please connect wallet to submit.</p>}
          </form>

          {/* Status Updates */}
          {txMessage && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              background: txMessage.type === 'success' ? 'rgba(46, 213, 115, 0.1)' : txMessage.type === 'error' ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255,255,255,0.1)', 
              borderRadius: '12px', 
              border: `1px solid ${txMessage.type === 'success' ? '#2ed573' : txMessage.type === 'error' ? '#ff4757' : 'rgba(255,255,255,0.2)'}` 
            }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: txMessage.type === 'success' ? '#2ed573' : txMessage.type === 'error' ? '#ff4757' : 'white' }}>
                {txMessage.text}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submissions Feed */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Recent AI Adjudications</h2>
        
        {submissions.length === 0 && !isLoading && (
          <div className="glass-card" style={{ textAlign: 'center', opacity: 0.7 }}>
            <p>No vulnerabilities submitted yet. Be the first to claim a bounty.</p>
          </div>
        )}

        {submissions.map((sub, idx) => {
          const isRewarded = sub.status && sub.status.includes('Rewarded');
          
          return (
            <div key={sub.id || idx} className="glass-card" style={{ marginBottom: '1rem', animationDelay: `${idx * 0.1}s`, border: `1px solid ${isRewarded ? '#2ed573' : '#ff4757'}` }}>
              <div className="grid">
                <div>
                  <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>Target URL</h3>
                  <a href={sub.url} target="_blank" rel="noreferrer" style={{ color: '#99f2c8', wordBreak: 'break-all' }}>{sub.url}</a>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>Submitter</h3>
                    <p style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{sub.submitter}</p>
                  </div>
                  
                  {sub.severity && sub.severity !== "None" && (
                    <div style={{ marginTop: '1rem' }}>
                      <span style={{ 
                        background: sub.severity === 'Critical' ? '#ff4757' : sub.severity === 'High' ? '#ffa502' : sub.severity === 'Medium' ? '#eccc68' : '#7bed9f',
                        color: sub.severity === 'Medium' || sub.severity === 'Low' ? '#2f3542' : 'white',
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold' 
                      }}>
                        {sub.severity} Severity
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>Economic Outcome</h3>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: isRewarded ? '#2ed573' : '#ff4757' }}>
                    {sub.status}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>LLM Consensus Remarks</h3>
                <p style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginTop: '0.5rem', fontStyle: 'italic', color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>
                  "{sub.reasoning}"
                </p>
              </div>
              
              {sub.patch && sub.patch.length > 5 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', opacity: 0.8, color: '#1e90ff' }}>Auto-Generated Code Patch</h3>
                  <pre style={{ background: '#2f3542', padding: '1rem', borderRadius: '12px', marginTop: '0.5rem', color: '#ced6e0', overflowX: 'auto', fontSize: '0.85rem' }}>
                    <code>{sub.patch}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
