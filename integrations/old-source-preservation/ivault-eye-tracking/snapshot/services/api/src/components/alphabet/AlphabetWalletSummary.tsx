import type { WalletSummary } from "../../lib/alphabet/wallet-store";

type Props = {
  summary: WalletSummary;
};

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  });
}

export function AlphabetWalletSummary({ summary }: Props) {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#111118] p-5 text-[#f0ede8]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/30">
            Alphabet Wallet
          </div>
          <div className="mt-1 text-xl font-semibold">{summary.wallet.walletStatus}</div>
        </div>

        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
          {summary.wallet.defaultCurrency}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Available" value={summary.totals.availableSpendableValue} />
        <MetricCard label="Pending" value={summary.totals.pendingValue} />
        <MetricCard label="Locked" value={summary.totals.lockedValue} />
        <MetricCard label="Identity" value={summary.totals.totalIdentityValue} />
        <MetricCard label="Score" value={summary.totals.totalScoreValue} />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="grid grid-cols-7 bg-white/[0.03] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/35">
          <div>Coin</div>
          <div className="text-right">Avail</div>
          <div className="text-right">Pending</div>
          <div className="text-right">Locked</div>
          <div className="text-right">Identity</div>
          <div className="text-right">Score</div>
          <div className="text-right">Life</div>
        </div>

        {summary.coins.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-white/35">No coin accounts yet.</div>
        ) : (
          summary.coins.map((coin) => (
            <div
              key={coin.coinCode}
              className="grid grid-cols-7 border-t border-white/[0.06] px-3 py-3 text-xs"
            >
              <div className="font-mono font-semibold text-emerald-300">{coin.coinCode}</div>
              <div className="text-right font-mono text-white/70">
                {formatAmount(coin.availableBalance)}
              </div>
              <div className="text-right font-mono text-amber-300/80">
                {formatAmount(coin.pendingBalance)}
              </div>
              <div className="text-right font-mono text-rose-300/80">
                {formatAmount(coin.lockedBalance)}
              </div>
              <div className="text-right font-mono text-cyan-300/80">
                {formatAmount(coin.identityBalance)}
              </div>
              <div className="text-right font-mono text-purple-300/80">
                {formatAmount(coin.scoreValue)}
              </div>
              <div className="text-right font-mono text-white/50">
                {formatAmount(coin.lifetimeEarned)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">{label}</div>
      <div className="mt-1 font-mono text-lg text-white">{formatAmount(value)}</div>
    </div>
  );
}
