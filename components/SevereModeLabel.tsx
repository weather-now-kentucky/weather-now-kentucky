export function SevereModeLabel({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <section className="severe-mode-label" aria-label="Severe weather mode active">
      Severe Weather Mode Active
    </section>
  );
}
