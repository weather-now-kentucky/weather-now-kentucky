type GeorgesForecastBoxProps = {
  forecastOverride: string;
  subtitle?: string;
  updatedAt: string;
};

export function GeorgesForecastBox({
  forecastOverride,
  subtitle = "Evening Severe Weather Update",
  updatedAt
}: GeorgesForecastBoxProps) {
  if (!forecastOverride.trim()) {
    return null;
  }

  return (
    <section className="george-forecast">
      <div className="george-forecast-header">
        <span>George&apos;s Forecast</span>
        <time>Updated at {updatedAt}</time>
      </div>
      <h2>{subtitle}</h2>
      <p className="george-forecast-subtitle">Local context from Weather Now Kentucky</p>
      <p className="george-forecast-body">{forecastOverride}</p>
    </section>
  );
}
