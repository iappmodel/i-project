/** Presentational components for audit package admin or public viewers. */

export function AuditPackageRequestTable({ items }: { items: any[] }) {
  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold">Audit package requests</h2>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2">Status</th>
              <th className="py-2">Type</th>
              <th className="py-2">Scope</th>
              <th className="py-2">Title</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Approved</th>
              <th className="py-2">Packages</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.admin_security_audit_package_request_id} className="border-t">
                <td className="py-3">{item.status}</td>
                <td className="py-3">{item.request_type}</td>
                <td className="py-3">{item.request_scope}</td>
                <td className="py-3">{item.title}</td>
                <td className="py-3">{item.customer_name ?? "—"}</td>
                <td className="py-3">{item.approved_at ?? "—"}</td>
                <td className="py-3">{item.package_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AuditPackageTable({ items }: { items: any[] }) {
  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold">Audit packages</h2>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2">Status</th>
              <th className="py-2">Type</th>
              <th className="py-2">Title</th>
              <th className="py-2">Items</th>
              <th className="py-2">Redacted</th>
              <th className="py-2">Integrity</th>
              <th className="py-2">Manifest hash</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.admin_security_audit_package_id} className="border-t">
                <td className="py-3">{item.status}</td>
                <td className="py-3">{item.package_type}</td>
                <td className="py-3">{item.title}</td>
                <td className="py-3">{item.item_count}</td>
                <td className="py-3">{item.redacted_item_count}</td>
                <td className="py-3">{item.integrity_status}</td>
                <td className="py-3 font-mono text-xs">
                  {item.manifest_hash_sha256?.slice(0, 16) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AuditPackageViewer({ pkg, items }: { pkg: any; items: any[] }) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <section className="rounded-xl border p-5">
        <p className="text-xs uppercase text-muted-foreground">Audit Package</p>
        <h1 className="mt-1 text-2xl font-semibold">{pkg.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Type: {pkg.package_type} · Integrity: {pkg.integrity_status}
        </p>

        <div className="mt-4 rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground">Manifest hash</p>
          <p className="mt-2 break-all font-mono text-xs">{pkg.manifest_hash_sha256}</p>
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Included evidence</h2>

        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article key={item.admin_security_audit_package_item_id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    {item.item_category} · {item.item_type}
                  </p>
                  <h3 className="mt-1 font-medium">{item.item_title ?? item.source_key}</h3>
                  {item.item_summary && (
                    <p className="mt-1 text-sm text-muted-foreground">{item.item_summary}</p>
                  )}
                </div>

                <span className="rounded-full border px-3 py-1 text-xs">{item.redaction_status}</span>
              </div>

              {item.proof_hash_sha256 && (
                <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
                  {item.proof_hash_sha256}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
