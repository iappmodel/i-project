import Link from "next/link";
import type { ReactNode } from "react";

export function TrustFraudReviewShell(props: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="border-b border-neutral-800 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-rose-400">[ i ] Trust / Fraud Review</p>
            <h1 className="mt-2 text-2xl font-semibold">{props.title}</h1>
            {props.description ? <p className="mt-1 text-sm text-neutral-400">{props.description}</p> : null}
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/risk-inbox"
              className="rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              Risk Inbox
            </Link>
            <Link
              href="/admin/review/queue"
              className="rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              Review Queue
            </Link>
          </div>
        </div>
      </div>
      <section className="mx-auto max-w-7xl px-6 py-6">{props.children}</section>
    </main>
  );
}
