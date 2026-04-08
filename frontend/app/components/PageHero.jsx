import { useState } from "react";

export default function PageHero({ tag, title, description, variant = "default", className = "" }) {
  return (
    <div className={`${variant === "diretor" ? "dir-header" : "page-hero"} ${className}`}>
      <div className={variant === "diretor" ? "dir-badge" : "hero-tag"}>
        {variant === "diretor" && (
          <svg viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        )}
        {tag}
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
