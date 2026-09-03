import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateToken } from '@/lib/tokens';

// POST /api/matches — admin creates a new match.
// TODO: gate this route behind admin auth (Supabase Auth) before any
// real deployment — right now anyone who can reach /admin can create
// matches. Fine for a solo/trusted-operator demo, not for production.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { target_url, match_duration_minutes } = body;

  if (!target_url || !match_duration_minutes) {
    return NextResponse.json(
      { error: 'target_url and match_duration_minutes are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('matches')
    .insert({
      target_url,
      match_duration_minutes,
      red_token: generateToken(),
      blue_token: generateToken(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('matches')
    .select('id, created_at, status, red_score, blue_score, match_duration_minutes')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
