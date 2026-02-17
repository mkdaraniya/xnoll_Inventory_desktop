import React from "react";

const UnifiedLoader = ({
  show = false,
  text = "Loading...",
  fullScreen = false,
  overlay = false,
  className = "",
}) => {
  if (!show) return null;

  const baseClass = fullScreen
    ? "xnoll-loader xnoll-loader-fullscreen"
    : overlay
    ? "xnoll-loader xnoll-loader-overlay"
    : "xnoll-loader xnoll-loader-inline";

  return (
    <div className={`${baseClass} ${className}`.trim()} role="status" aria-live="polite">
      <div className="xnoll-loader-spinner" aria-hidden="true" />
      <span className="xnoll-loader-text">{text}</span>
    </div>
  );
};

export default UnifiedLoader;
