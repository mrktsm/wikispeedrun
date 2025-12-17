import "./WikipediaSkeleton.css";

const WikipediaSkeleton = () => {
  return (
    <div className="wiki-skeleton">
      {/* Title */}
      <div className="skeleton-title skeleton-pulse" />
      
      {/* Infobox on the right */}
      <div className="skeleton-infobox">
        <div className="skeleton-infobox-image skeleton-pulse" />
        <div className="skeleton-infobox-row skeleton-pulse" />
        <div className="skeleton-infobox-row skeleton-pulse" />
        <div className="skeleton-infobox-row skeleton-pulse" />
        <div className="skeleton-infobox-row short skeleton-pulse" />
      </div>

      {/* First paragraph (intro) - wraps around infobox */}
      <div className="skeleton-paragraph skeleton-paragraph-with-infobox">
        <div className="skeleton-line skeleton-pulse" style={{ width: "100%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "95%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "98%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "85%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "92%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "60%" }} />
      </div>

      {/* Second paragraph - still wraps around infobox */}
      <div className="skeleton-paragraph skeleton-paragraph-with-infobox">
        <div className="skeleton-line skeleton-pulse" style={{ width: "100%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "97%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "100%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "88%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "45%" }} />
      </div>

      {/* Section heading */}
      <div className="skeleton-heading skeleton-pulse" />

      {/* Third paragraph */}
      <div className="skeleton-paragraph">
        <div className="skeleton-line skeleton-pulse" style={{ width: "100%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "94%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "100%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "90%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "96%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "70%" }} />
      </div>

      {/* Fourth paragraph */}
      <div className="skeleton-paragraph">
        <div className="skeleton-line skeleton-pulse" style={{ width: "100%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "92%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "55%" }} />
      </div>

      {/* Another section heading */}
      <div className="skeleton-heading short skeleton-pulse" />

      {/* Fifth paragraph */}
      <div className="skeleton-paragraph">
        <div className="skeleton-line skeleton-pulse" style={{ width: "100%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "98%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "100%" }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: "82%" }} />
      </div>
    </div>
  );
};

export default WikipediaSkeleton;

