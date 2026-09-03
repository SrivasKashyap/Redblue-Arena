'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RedArenaPage() {
  const token = useSearchParams().get('token');
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [redScore, setRedScore] = useState(0);
  const [flag, setFlag] = useState('');

  // Resolve target_url + live score for this match via a lightweight
  // server lookup keyed by token (kept out of the public `matches`
  // table select — see supabase/policies.sql).
  useEffect(() => {
    if (!token) return;
    fetch(`/api/matches/by-token?token=${token}&role=red`)
      .then((r) => r.json())
      .then((d) => {
        if (d.target_url) setTargetUrl(d.target_url);
        if (typeof d.red_score === 'number') setRedScore(d.red_score);
      });
  }, [token]);

  useEffect(() => {
    const channel = supabase
      .channel('red-scoreboard')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
        setRedScore(payload.new.red_score);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const submitFlag = async () => {
    // TODO: flag verification isn't in the base schema yet — see
    // README "What's stubbed" for the recommended approach (a `flags`
    // table keyed by match_id, or reuse http_logs.attack_category
    // matches). Wire this once that decision is made.
    alert(`Flag submission not yet wired to a backend table: ${flag}`);
  };

  if (!token) return <p className="p-8 text-crimson">Missing token.</p>;

  return (
    <main className="grid min-h-screen grid-cols-1 gap-4 p-4 text-neutral-200 lg:grid-cols-3">
      <section className="lg:col-span-2 rounded-lg border border-crimson/40">
        {targetUrl ? (
          <iframe src={targetUrl} className="h-full min-h-[600px] w-full rounded-lg" title="target" />
        ) : (
          <p className="p-8 text-neutral-500">Loading target...</p>
        )}
      </section>

      <aside className="space-y-4">
        <div className="rounded-lg border border-crimson/40 p-4">
          <h2 className="font-semibold text-crimson">Red Team</h2>
          <p className="text-3xl font-mono">{redScore}</p>
        </div>

        <div className="rounded-lg border border-neutral-800 p-4">
          <h3 className="mb-2 font-semibold text-gold">Submit CTF Flag</h3>
          <input
            className="mb-2 w-full rounded bg-neutral-900 p-2 font-mono text-sm"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            placeholder="FLAG{...}"
          />
          <button onClick={submitFlag} className="w-full rounded bg-crimson py-2 font-semibold">
            Submit
          </button>
        </div>
      </aside>
    </main>
  );
}
