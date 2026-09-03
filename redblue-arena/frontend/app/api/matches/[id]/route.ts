import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// PATCH /api/matches/:id — { action: 'start' | 'complete' | 'reset' }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action } = await req.json();

  const updates: Record<string, unknown> = {};
  if (action === 'start') {
    updates.status = 'active';
    updates.started_at = new Date().toISOString();
  } else if (action === 'complete') {
    updates.status = 'completed';
  } else if (action === 'reset') {
    updates.status = 'pending';
    updates.red_score = 0;
    updates.blue_score = 0;
  } else {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
