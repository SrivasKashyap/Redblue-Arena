import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// POST /api/matches/:id/waf — { token, rule_key, enabled }
// `token` must be the match's blue_token — only Blue can toggle WAF rules.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { token, rule_key, enabled } = await req.json();

  const { data: match, error: matchErr } = await supabaseAdmin
    .from('matches')
    .select('blue_token, status')
    .eq('id', params.id)
    .single();

  if (matchErr || !match) return NextResponse.json({ error: 'match not found' }, { status: 404 });
  if (match.blue_token !== token) return NextResponse.json({ error: 'invalid token' }, { status: 403 });
  if (match.status !== 'active')
    return NextResponse.json({ error: 'match is not active' }, { status: 409 });

  const { data, error } = await supabaseAdmin
    .from('waf_rules')
    .upsert(
      { match_id: params.id, rule_key, enabled, toggled_at: new Date().toISOString() },
      { onConflict: 'match_id,rule_key' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
