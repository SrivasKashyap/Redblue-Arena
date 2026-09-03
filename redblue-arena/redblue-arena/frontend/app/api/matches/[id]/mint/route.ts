import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const CREDENTIAL_ABI = [
  'function mintCredential(address to, string metadataURI) external returns (uint256)',
];

const RPC_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), ms)),
  ]);
}

// POST /api/matches/:id/mint — admin action, enabled once status = 'completed'.
// Mints one credential per role (red/blue). Falls back to mint_mode =
// 'simulated' if the Amoy RPC call fails or times out, so a live judged
// demo never breaks on a flaky public RPC (Section 7 of the build prompt).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: match, error: matchErr } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', params.id)
    .single();

  if (matchErr || !match) return NextResponse.json({ error: 'match not found' }, { status: 404 });
  if (match.status !== 'completed')
    return NextResponse.json({ error: 'match is not completed yet' }, { status: 409 });

  const results = [];

  for (const role of ['red', 'blue'] as const) {
    const score = role === 'red' ? match.red_score : match.blue_score;

    // Metadata JSON — off-chain, referenced by metadata_uri.
    // TODO: pin to nft.storage instead of Supabase Storage for a truly
    // decentralized reference; Supabase Storage is used here for
    // simplicity/free-tier speed.
    const metadata = {
      match_id: match.id,
      role,
      score,
      minted_at: new Date().toISOString(),
    };
    const path = `credentials/${match.id}-${role}.json`;
    await supabaseAdmin.storage
      .from('metadata')
      .upload(path, JSON.stringify(metadata), { contentType: 'application/json', upsert: true });

    const { data: pub } = supabaseAdmin.storage.from('metadata').getPublicUrl(path);
    const metadataUri = pub.publicUrl;

    let mintMode: 'onchain' | 'simulated' = 'onchain';
    let txHash = `SIMULATED-${match.id}-${role}-${Date.now()}`;

    try {
      const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
      const wallet = new ethers.Wallet(process.env.SERVICE_WALLET_PRIVATE_KEY!, provider);
      const contract = new ethers.Contract(
        process.env.CREDENTIAL_CONTRACT_ADDRESS!,
        CREDENTIAL_ABI,
        wallet
      );

      // No personal wallet required (Section 7, v1 recommendation):
      // mint to the service wallet's own address and record the tx hash
      // + metadata_uri as the portable proof.
      const tx = await withTimeout(
        contract.mintCredential(wallet.address, metadataUri),
        RPC_TIMEOUT_MS
      );
      const receipt = await withTimeout(tx.wait(), RPC_TIMEOUT_MS);
      txHash = receipt.hash;
    } catch (err) {
      console.error(`Amoy mint failed for ${role}, falling back to simulate mode:`, err);
      mintMode = 'simulated';
    }

    const { data: cred, error } = await supabaseAdmin
      .from('credentials')
      .insert({
        match_id: match.id,
        role,
        score,
        nft_tx_hash: txHash,
        metadata_uri: metadataUri,
        minted_at: new Date().toISOString(),
        mint_mode: mintMode,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    results.push(cred);
  }

  return NextResponse.json(results);
}
