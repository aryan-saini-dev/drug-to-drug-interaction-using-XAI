import React, { useState, useEffect, useRef } from 'react';
import { fetchHealthCheck } from '../services/api';

/**
 * Detects Render free-tier cold starts and shows a warm-up banner.
 * - Silently checks /api/health on mount with a 3s "grace period"
 * - Only shows the banner if the server takes > 3s to respond
 * - Auto-retries every 6s until the server is ready
 * - Shows a brief "✓ Engine Ready" confirmation then fades out
 */
export default function ServerWarmingBanner() {
  // 'idle' → quietly waiting | 'warming' → show banner | 'ready' → show success | 'hidden'
  const [phase, setPhase] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const mountedRef = useRef(true);
  const retryRef = useRef(null);
  const elapsedRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    // Start elapsed counter once warming is detected
    const startElapsed = () => {
      elapsedRef.current = setInterval(() => {
        if (mountedRef.current) setElapsed(s => s + 1);
      }, 1000);
    };

    const checkServer = async () => {
      const controller = new AbortController();
      // Give the server 25s per attempt (Render cold start can take up to 30s)
      const timeout = setTimeout(() => controller.abort(), 25000);

      try {
        await fetchHealthCheck(controller.signal);
        clearTimeout(timeout);
        if (!mountedRef.current) return;

        // Server responded — stop timers and show "Ready" confirmation
        clearInterval(elapsedRef.current);
        clearTimeout(retryRef.current);
        setPhase('ready');

        // Auto-hide the "Ready" badge after 3s
        setTimeout(() => {
          if (mountedRef.current) setPhase('hidden');
        }, 3000);
      } catch {
        clearTimeout(timeout);
        if (!mountedRef.current) return;

        // Show warming banner and schedule retry
        if (phase !== 'warming') {
          setPhase('warming');
          startElapsed();
        }
        retryRef.current = setTimeout(checkServer, 6000);
      }
    };

    // 3-second grace period — don't show banner on fast connections
    const graceTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      // If still in idle phase, server hasn't responded yet → start warming
      setPhase(prev => {
        if (prev === 'idle') {
          // Server is slow — show banner now
          return 'warming';
        }
        return prev;
      });
    }, 3000);

    checkServer();

    return () => {
      mountedRef.current = false;
      clearTimeout(graceTimer);
      clearTimeout(retryRef.current);
      clearInterval(elapsedRef.current);
    };
  }, []);

  if (phase === 'idle' || phase === 'hidden') return null;

  if (phase === 'ready') {
    return (
      <div className="server-warming-banner server-warming-ready" role="status">
        <span className="warming-check-icon">✓</span>
        <span className="warming-ready-text">AI Engine Ready</span>
      </div>
    );
  }

  // phase === 'warming'
  return (
    <div className="server-warming-banner" role="status" aria-live="polite">
      <div className="warming-spinner" aria-hidden="true">
        <div className="warming-spinner-ring" />
      </div>
      <div className="warming-text-block">
        <span className="warming-title">Warming up AI Engine</span>
        <span className="warming-subtitle">
          Free-tier cold start · Please wait
          {elapsed > 0 && <span className="warming-elapsed"> ({elapsed}s)</span>}
        </span>
      </div>
      <div className="warming-progress-bar">
        <div
          className="warming-progress-fill"
          style={{ width: `${Math.min((elapsed / 30) * 100, 95)}%` }}
        />
      </div>
    </div>
  );
}
