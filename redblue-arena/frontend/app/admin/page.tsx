'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Match = {
  id: string;
  status: string;
  red_score: number;
  blue_score: number;
  match_duration_minutes: number;
  created_at: string;
};

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [targetUrl, setTargetUrl] = useState('');
  const [duration, setDuration] = useState(30);
  const [links, setLinks] = useState<{ id: string; red: string; blue: string } | null>(null);

  const refresh = async () => {
    const res = await fetch('/api/matches');
    setMatches(await res.json());
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('admin-scoreboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createMatch = async () => {
    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_url: targetUrl, match_duration_minutes: duration }),
    });
    const data = await res.json();
    if (data.id) {
      setLinks({
        id: data.id,
        red: `${window.location.origin}/arena/red?token=${data.red_token}`,
        blue: `${window.location.origin}/arena/blue?token=${data.blue_token}`,
      });
      setTargetUrl('');
      refresh();
    }
  };

  const doAction = async (id: string, action: string) => {
    await fetch(`/api/matches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    refresh();
  };

  const mint = async (id: string) => {
    const res = await fetch(`/api/matches/${id}/mint`, { method: 'POST' });
    const data = await res.json();
    alert(JSON.stringify(data, null, 2));
  };

  return (
    <main className="min-h-screen p-8 text-neutral-200">
      <h1 className="mb-6 text-2xl font-bold text-arenapurple">Admin — RedBlue Arena</h1>

      <section className="mb-10 max-w-lg rounded-lg border border-neutral-800 p-4">
        <h2 className="mb-3 font-semibold text-gold">Create Match</h2>
        <input
          className="mb-2 w-full rounded bg-neutral-900 p-2"
          placeholder="Fly.io/Render proxy URL (target_url)"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
        />
        <input
          type="number"
          className="mb-2 w-full rounded bg-neutral-900 p-2"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        <button
          onClick={createMatch}
          className="rounded bg-arenapurple px-4 py-2 font-semibold text-white"
        >
          Create Match
        </button>

        {links && (
          <div className="mt-4 space-y-1 text-sm">
            <p className="text-crimson">Red: {links.red}</p>
            <p className="text-cyan">Blue: {links.blue}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-gold">Matches</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-crimson">Red</th>
              <th className="p-2 text-cyan">Blue</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id} className="border-t border-neutral-800">
                <td className="p-2 font-mono text-xs">{m.id.slice(0, 8)}</td>
                <td className="p-2">{m.status}</td>
                <td className="p-2 text-crimson">{m.red_score}</td>
                <td className="p-2 text-cyan">{m.blue_score}</td>
                <td className="p-2 space-x-2">
                  {m.status === 'pending' && (
                    <button onClick={() => doAction(m.id, 'start')} className="text-cyan underline">
                      Start
                    </button>
                  )}
                  {m.status === 'active' && (
                    <button onClick={() => doAction(m.id, 'complete')} className="text-gold underline">
                      Complete
                    </button>
                  )}
                  {m.status === 'completed' && (
                    <button onClick={() => mint(m.id)} className="text-arenapurple underline">
                      Mint Credentials
                    </button>
                  )}
                  <button onClick={() => doAction(m.id, 'reset')} className="text-neutral-500 underline">
                    Reset
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
