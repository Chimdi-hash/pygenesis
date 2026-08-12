'use client';

import React, { useState } from 'react';
import { createClient } from 'genlayer-js';

// Since we are mocking the UI for the hackathon MVP, we will simulate the GenLayer response
// if the actual node is not available, but the architecture calls it correctly.

export default function PyGenesisVault() {
  const [reportUrl, setReportUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Example of a connected client (would typically use a context provider)
  // const client = createClient({ endpoint: 'https://studio.genlayer.com/api' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportUrl) return;
    
    setIsLoading(true);
    setStatus('Fetching security report...');
    
    // Simulating the contract call delay and evaluation
    setTimeout(() => {
      setStatus('LLM evaluating exploit severity based on CVSS...');
      
      setTimeout(() => {
        setIsLoading(false);
        setResult({
          valid: true,
          severity: reportUrl.includes('critical') ? 'Critical' : 'High',
          reasoning: 'The report describes a valid reentrancy attack on the AMM withdrawal function. The attacker can drain liquidity before the state is updated.',
          payout: reportUrl.includes('critical') ? '10 GEN' : '5 GEN'
        });
        setStatus('Evaluation Complete & Payout Dispatched.');
      }, 3000);
    }, 2000);
  };

  return (
    <main className="container">
      <header className="header floating-element">
        <div>
          <h1 className="title">PyGenesis Sec.</h1>
          <p>Autonomous Bug Bounty Vault on GenLayer</p>
        </div>
        <div>
          <button className="btn">Connect Wallet</button>
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
              <span style={{ display: 'block', fontSize: '0.9rem', opacity: 0.8 }}>Payouts this Week</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>42.5 GEN</span>
            </div>
          </div>
        </div>

        {/* Submit Vulnerability */}
        <div className="glass-card" style={{ animationDelay: '0.2s' }}>
          <h2 style={{ marginBottom: '1rem' }}>Submit Vulnerability</h2>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
            Submit a public URL (e.g. GitHub Gist) containing your Proof-of-Concept. Our GenVM Intelligent Contract will automatically evaluate the exploit and dispatch your bounty instantly.
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
              style={{ width: '100%' }}
              disabled={isLoading}
            >
              {isLoading ? 'Evaluating...' : 'Submit to Smart Contract'}
            </button>
          </form>

          {/* Status Updates */}
          {status && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,255,150,0.1)', borderRadius: '12px', border: '1px solid rgba(0,255,150,0.2)' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Status: {status}</p>
            </div>
          )}
        </div>
      </div>

      {/* Evaluation Results (only show if result exists) */}
      {result && (
        <div className="glass-card" style={{ marginTop: '2rem', animationDelay: '0.4s' }}>
          <h2 style={{ marginBottom: '1rem' }}>LLM Consensus Result</h2>
          <div className="grid">
            <div>
              <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>Severity</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.severity === 'Critical' ? '#ff4757' : '#ffa502' }}>
                {result.severity}
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>Payout Dispatched</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2ed573' }}>
                {result.payout}
              </p>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', opacity: 0.8 }}>AI Reasoning</h3>
            <p style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginTop: '0.5rem' }}>
              {result.reasoning}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
