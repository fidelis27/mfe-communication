import React from "react";

export function RemoteSkeleton({ label }: { label: string }) {
  return (
    <section className="remote-state remote-skeleton" aria-live="polite" aria-busy="true">
      <p className="eyebrow">Carregando módulo</p>
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-copy" />
      <div className="skeleton-line skeleton-copy short" />
      <div className="skeleton-card-grid" aria-hidden="true">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <span className="sr-only">{label}</span>
    </section>
  );
}
