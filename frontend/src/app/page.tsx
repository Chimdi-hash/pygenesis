'use client';

import React, { useState } from 'react';
import { createClient } from 'genlayer-js';

export default function PyGenesisVault() {
  const [reportUrl, setReportUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Wallet State
  const [isConnected, setIsConnected] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const walletAddress = "0x7F5...3A2";

  const connectWallet = () => {
    setIsConnected(true);
    setWalletBalance(12.5); // Mock balance in GEN
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletBalance(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportUrl) return;
    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }
    
    setIsLoading(true);
    setStatus('Confirming transaction... (Locking 1 GEN Stake)');
    
    setTimeout(() => {
      if (walletBalance !== null) setWalletBalance(walletBalance - 1);
      setStatus('Fetching security report...');
      
      setTimeout(() => {
        setStatus('LLM evaluating exploit validity & spam...');
        
        setTimeout(() => {
          setIsLoading(false);
          const isValid = reportUrl.toLowerCase().includes('critical') || reportUrl.toLowerCase().includes('valid');
          
          if (isValid) {
            setResult({
              valid: true,
              outcome: 'Rewarded (4 GEN Reward + 1 GEN Stake Returned)',
              reasoning: 'The report describes a valid reentrancy attack on the AMM withdrawal function. The exploit is verifiable and poses a legitimate threat.',
            });
            if (walletBalance !== null) setWalletBalance(walletBalance - 1 + 5); // 4 reward + 1 stake back
          } else {
            setResult({
              valid: false,
              outcome: 'Slashed (1 GEN Stake Burned)',
              reasoning: 'The report is low-effort spam and does not contain a verifiable exploit against the protocol codebase. Stake burned to prevent sybil attacks.',
            });
            // balance already deducted the 1 GEN stake
          }
          setStatus('Evaluation Complete.');
        }, 3000);
      }, 2000);
    }, 1500);
  };

  return (
    <main className="container">
      <header className="header floating-element">
        <div>
          <h1 className="title">PyGenesis Sec.</h1>
          <p>Autonomous Bug Bounty Vault</p>
        </div>
        <div>
          {!isConnected ? (
            <button className="btn" onClick={connectWallet}>Connect Wallet</button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{walletAddress}</div>
                <div style={{ fontWeight: 'bold', color: '#2ed573' }}>{walletBalance?.toFixed(2)} GEN</div>
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
              <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>250,000 GEN</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
              <span style={{ display: 'block', fontSize: '0.9rem', opacity: 0.8 }}>Standard Bounty Reward</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2ed573' }}>4.0 GEN</span>
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
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', opacity: !isConnected ? 0.5 : 1 }}
              disabled={isLoading || !isConnected}
            >
              {isLoading ? 'Evaluating...' : 'Stake 1 GEN & Submit'}
            </button>
            {!isConnected && <p style={{ fontSize: '0.8rem', color: '#ff4757', marginTop: '0.5rem', textAlign: 'center' }}>Please connect wallet to submit.</p>}
          </form>

          {/* Status Updates */}
          {status && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Status: {status}</p>
            </div>
          )}
        </div>
      </div>

      {/* Evaluation Results (only show if result exists) */}
      {result && (
        <div className="glass-card" style={{ marginTop: '2rem', animationDelay: '0.4s', border: `1px solid ${result.valid ? '#2ed573' : '#ff4757'}` }}>
          <h2 style={{ marginBottom: '1rem' }}>LLM Consensus Result</h2>
          <div className="grid">
            <div>
              <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>Verdict</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.valid ? '#2ed573' : '#ff4757' }}>
                {result.valid ? 'VALID EXPLOIT' : 'INVALID / SPAM'}
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>Economic Outcome</h3>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: result.valid ? '#2ed573' : '#ff4757' }}>
                {result.outcome}
              </p>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>AI Remarks</h3>
            <p style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginTop: '0.5rem', fontStyle: 'italic' }}>
              "{result.reasoning}"
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
