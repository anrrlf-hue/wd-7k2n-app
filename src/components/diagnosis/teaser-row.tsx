export function TeaserRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="blur-teaser mt-1.5 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
