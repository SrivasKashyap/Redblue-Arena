import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function getCredential(txHash: string) {
  const { data } = await supabaseAdmin
    .from('credentials')
    .select('*')
    .eq('nft_tx_hash', txHash)
    .maybeSingle();
  return data;
}

export default async function VerifyPage({ params }: { params: { txHash: string } }) {
  const cred = await getCredential(params.txHash);

  if (!cred) {
    return (
      <main className="flex min-h-screen items-center justify-center text-neutral-400">
        No credential found for this reference.
      </main>
    );
  }

  const isOnchain = cred.mint_mode === 'onchain';
  const polygonScanUrl = `https://amoy.polygonscan.com/tx/${cred.nft_tx_hash}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold text-gold">RedBlue Arena Credential</h1>
      <p className="text-neutral-400">
        Role: <span className="text-cyan">{cred.role}</span> · Score:{' '}
        <span className="text-crimson">{cred.score}</span>
      </p>

      {isOnchain ? (
        <a
          href={polygonScanUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-arenapurple px-4 py-2 font-semibold text-white"
        >
          View on PolygonScan (Amoy)
        </a>
      ) : (
        <div className="rounded border border-gold/60 bg-gold/10 px-4 py-2 text-sm text-gold">
          Demo Mode — Not On-Chain. This credential's metadata and score are
          recorded, but the mint fell back to simulate mode (RPC was
          unavailable at mint time). It is not independently verifiable
          on-chain.
        </div>
      )}

      <p className="text-xs text-neutral-600">Reference: {cred.nft_tx_hash}</p>
    </main>
  );
}
