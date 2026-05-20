import React from "react";

export function TrustCenterSections({ sections }: { sections: any[] }) {
  if (!sections.length) return null;

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {sections.map((section) => (
        <article
          key={section.admin_security_trust_transparency_portal_section_id}
          className="rounded-xl border p-5"
        >
          <p className="text-xs uppercase text-muted-foreground">{section.section_type}</p>
          <h2 className="mt-1 text-lg font-semibold">{section.title}</h2>
          {section.summary ? (
            <p className="mt-2 text-sm text-muted-foreground">{section.summary}</p>
          ) : null}
          {section.body ? <p className="mt-4 text-sm leading-6">{section.body}</p> : null}
        </article>
      ))}
    </section>
  );
}
