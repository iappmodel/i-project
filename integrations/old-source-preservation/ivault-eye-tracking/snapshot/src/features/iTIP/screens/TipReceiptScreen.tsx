import React from "react";
import { useTipHistory } from "../hooks/useTipHistory";
import TipReceiptCard from "../components/TipReceiptCard";
import TipEmptyState from "../components/TipEmptyState";

export function TipReceiptScreen({ id }: { id?: string }) {
  const { items, loading } = useTipHistory();
  // if id not provided via prop, extract from URL
  let txId = id;
  if (!txId && typeof window !== "undefined") {
    const m = window.location.pathname.match(/\\/itip\\/receipt\\/(.+)/);
    if (m) txId = decodeURIComponent(m[1]);
  }
  const tx = items?.find((t) => t.id === txId) ?? items?.[0];
  if (loading) return <div className="p-4">Loading...</div>;
  if (!tx) return <TipEmptyState title="No receipt found" subtitle="No matching transaction" />;
  return (
    <div className="p-4">
      <TipReceiptCard tx={tx} />
    </div>
  );
}

export default TipReceiptScreen;

