"use client";

import { useState } from "react";

const weatherWiseRadarUrl = "https://web.weatherwise.app/#map=6.93/38.017/-85.887&m=COMPOSITE&autoplay=1&ui=0";

export function RadarTabs() {
  const [activeTab, setActiveTab] = useState<"live" | "future">("live");

  return (
    <section className="radar-panel">
      <div className="radar-tabs" role="tablist" aria-label="Radar views">
        <button
          aria-selected={activeTab === "live"}
          className="radar-tab"
          onClick={() => setActiveTab("live")}
          role="tab"
          type="button"
        >
          Live Radar
        </button>
        <button
          aria-selected={activeTab === "future"}
          className="radar-tab"
          onClick={() => setActiveTab("future")}
          role="tab"
          type="button"
        >
          Future Radar
        </button>
      </div>

      <div className="radar-frame-wrap" role="tabpanel">
        {activeTab === "live" ? (
          <>
            <iframe
              allowFullScreen
              className="radar-frame"
              referrerPolicy="strict-origin-when-cross-origin"
              src={weatherWiseRadarUrl}
              title="WeatherWise live radar for Kentucky"
            />
            <p className="radar-fallback">
              If the live radar does not load,{" "}
              <a href={weatherWiseRadarUrl} rel="noopener noreferrer" target="_blank">
                open WeatherWise radar in a new tab
              </a>
              .
            </p>
          </>
        ) : (
          <div className="radar-placeholder">
            <span className="eyebrow">Future Radar</span>
            <h2>Future radar coming soon.</h2>
            <p>WeatherWise HRRR future radar will be added here when the embed URL is available.</p>
          </div>
        )}
      </div>

      <div className="weatherwise-attribution">
        <p>Radar powered by WeatherWise.</p>
        <a className="weatherwise-logo-link" href="https://weatherwise.app" rel="noopener noreferrer" target="_blank">
          <img alt="WeatherWise logo" src="https://web.weatherwise.app/favicon.ico" />
          <span>More Radar &amp; Model Tools from WeatherWise</span>
        </a>
      </div>
    </section>
  );
}
