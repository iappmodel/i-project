import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/admin/review", label: "All Cases" },
  { href: "/admin/review/queue", label: "Queue" },
  { href: "/admin/review/assigned", label: "Assigned" },
  { href: "/admin/review/escalations", label: "Escalations" },
  { href: "/admin/command-center", label: "Command Center" },
  { href: "/admin/risk-inbox", label: "Risk Inbox" },
  { href: "/admin/timeline", label: "System Timeline" }
];

export function AdminReviewShell(props: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="border-b border-neutral-800 bg-neutral-950/90 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              [ i ] Admin Console
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {props.title}
            </h1>
            {props.description ? (
              <p className="mt-1 text-sm text-neutral-400">{props.description}</p>
            ) : null}
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-600 hover:bg-neutral-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-6">{props.children}</section>
    </main>
  );
}
