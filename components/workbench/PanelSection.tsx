import React from "react";

export function PanelSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="section-title">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
