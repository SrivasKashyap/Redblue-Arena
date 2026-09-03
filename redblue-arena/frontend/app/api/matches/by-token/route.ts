import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/matches/by-token?token=...&role=red|blue
// Resolves a match for the candidate-facing arena pages without ever
// exposing red_token/blue_token to the client (the public `matches`
// table/view never includes those columns — see supabase/policies.sql).
// Tokens also expire once a match's status = 'completed'.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const role = searchParams.get('role');

  if (!token || (role !== 'red' && role !== 'blue')) {
    return NextResponse.json({ error: 'token and role are required' }, { status: 400 });
  }

  const tokenColumn = role === 'red' ? 'red_token' : 'blue_token';

  const { data: match, error } = await supabaseAdmin
    .from('matches')
    .select('id, status, target_url, red_score, blue_score')
    .eq(tokenColumn, token)
    .single();

  if (error || !match) return NextResponse.json({ error: 'invalid token' }, { status: 404 });
  if (match.status === 'completed') {
    return NextResponse.json({ error: 'match has ended' }, { status: 410 });
  }

  return NextResponse.json(match);
}
