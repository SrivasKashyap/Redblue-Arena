'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const WAF_RULES = [
  { key: 'sqli_shield', label: 'SQLi Shield' },
  { key: 'xss_filter', label: 'XSS Filter' },
  { key: 'path_traversal_shield', label: 'Path Traversal Shield' },
  { key: 'rate_limiter', label: 'IP Rate Limiter' },
];

type LogRow = {
  id: string;
  method: string;
  path: string;
  request_body: string;
  status_code: number | null;
  is_malicious: boolean;
  attack_category: string | null;
  timestamp: string;
};

export default function BlueArenaPage() {
  const token = useSearchParams().get('token');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [blueScore, setBlueScore] = useState(0);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [rules, setRules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    fetch(`/api/matches/by-token?token=${token}&role=blue`)
      .then((r) => r.json())
      .then((d) => {
        if (d.id) setMatchId(d.id);
        if (typeof d.blue_score === 'number') setBlueScore(d.blue_score);
      });
  }, [token]);

  useEffect(() => {
    if (!matchId) return;

    supabase
      .from('http_logs')
      .select('*')
      .eq('match_id', matchId)
      .order('timestamp', { ascending: false })
      .limit(100)
      .then(({ data }) => data && setLogs(data as LogRow[]));

    const channel = supabase
      .channel(`blue-logs-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'http_logs', filter: `match_id=eq.${matchId}` },
        (payload) => setLogs((prev) => [payload.new as LogRow, ...prev].slice(0, 100))
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => setBlueScore(payload.new.blue_score)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const toggleRule = async (rule_key: string) => {
    if (!matchId || !token) return;
    const enabled = !rules[rule_key];
    setRules((r) => ({ ...r, [rule_key]: enabled }));
    await fetch(`/api/matches/${matchId}/waf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, rule_key, enabled }),
    });
  };

  if (!token) return <p className="p-8 text-crimson">Missing token.</p>;

  return (
    <main className="grid min-h-screen grid-cols-1 gap-4 p-4 text-neutral-200 lg:grid-cols-3">
      <section className="lg:col-span-2 rounded-lg border border-cyan/40 p-2">
        <h2 className="mb-2 font-semibold text-cyan">Live Log Stream</h2>
        <div className="max-h-[80vh] overflow-y-auto font-mono text-xs">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`border-b border-neutral-800 p-2 ${
                log.is_malicious ? 'bg-crimson/10' : ''
              }`}
            >
              <span className="text-neutral-500">{log.timestamp}</span>{' '}
              <span className="text-cyan">{log.method}</span> {log.path}{' '}
              {log.attack_category && (
                <span className="ml-2 rounded bg-crimson/30 px-1 text-crimson">
                  {log.attack_category}
                </span>
              )}
              {/* Body rendered as plain escaped text only — never HTML. */}
              <div className="text-neutral-600">{log.request_body}</div>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-lg border border-cyan/40 p-4">
          <h2 className="font-semibold text-cyan">Blue Team</h2>
          <p className="text-3xl font-mono">{blueScore}</p>
        </div>

        <div className="rounded-lg border border-neutral-800 p-4">
          <h3 className="mb-2 font-semibold text-gold">WAF Rules</h3>
          {WAF_RULES.map((rule) => (
            <label key={rule.key} className="mb-2 flex items-center justify-between text-sm">
              {rule.label}
              <input
                type="checkbox"
                checked={!!rules[rule.key]}
                onChange={() => toggleRule(rule.key)}
              />
            </label>
          ))}
        </div>
      </aside>
    </main>
  );
}
