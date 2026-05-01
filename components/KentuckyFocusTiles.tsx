const regions = ["Western KY", "Central KY", "Eastern KY"];

export function KentuckyFocusTiles() {
  return (
    <section className="kentucky-focus">
      <div className="forecast-heading">
        <span className="eyebrow">Kentucky Weather Focus</span>
        <h2>Regional outlook</h2>
      </div>
      <div className="kentucky-focus-grid">
        {regions.map((region) => (
          <article className="kentucky-focus-tile" key={region}>
            <h3>{region}</h3>
            <p>Regional forecast details coming soon.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
