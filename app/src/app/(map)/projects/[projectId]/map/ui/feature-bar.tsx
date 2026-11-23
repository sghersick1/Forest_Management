"use client";

/*
 * The feature list in the left sidebar.
 * A row selects that feature. In link mode, a row toggles the link.
 */

import { useEffect, useRef, useState } from "react";
import { useMap } from "../state/map-context";
import { FeatureListRow } from "./feature-list-row";

const headerButtonClass =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-text-primary transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary";

// Feature rows for the open map, including link mode.
export function FeatureBar() {
  const {
    linking,
    selectedFeature,
    setSelectedFeature,
    setTool,
    features,
    highlightedFeatureIds,
    toggleLinkedFeature,
    hoverFeature,
    setHoverFeature,
  } = useMap();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const searchButton = useRef<HTMLButtonElement>(null);
  const visibleFeatures = features.filter((feature) => {
    const name = typeof feature.properties.name === "string" ? feature.properties.name : String(feature.id);
    return name.toLowerCase().includes(query.trim().toLowerCase());
  });

  function closeSearch() {
    setQuery("");
    setSearching(false);
    requestAnimationFrame(() => searchButton.current?.focus());
  }

  useEffect(() => {
    if (linking) return;
    setHoverFeature(null);
  }, [linking, setHoverFeature]);

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-surface-translucent-placeholder px-4 py-2">
        {searching ? (
          <>
          <div className="peer flex h-7 min-w-0 flex-1 items-center rounded-[4px] bg-surface-canvas focus-within:bg-surface-translucent-placeholder-2 focus-within:outline-1 focus-within:outline-text-primary">
            <img src="/icons/map/search-outline.svg" alt="" width={18} height={18} className="ml-1 block shrink-0 translate-y-[0.5px]" />
            <input
              autoFocus
              aria-label="Search features"
              placeholder="Find..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeSearch();
                }
              }}
              className="template-body-small h-7 min-w-0 flex-1 border-0 bg-transparent px-1 py-0 leading-7 text-text-primary outline-none placeholder:text-text-secondary"
            />
          </div>
            <button type="button" aria-label="Close feature search" onClick={closeSearch} className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-text-primary transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder-2 outline-none">
              <img src="/icons/map/close-outline.svg" alt="" width={18} height={18} />
            </button>
          </>
        ) : (
          <>
            <p className="template-body-medium-emphasized min-w-0 flex-1 text-text-primary">Features</p>
            <button ref={searchButton} type="button" aria-label="Search features" onClick={() => setSearching(true)} className={headerButtonClass}>
              <img src="/icons/map/search-outline.svg" alt="" width={18} height={18} />
            </button>
          </>
        )}
      </header>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto py-2">
        {visibleFeatures.map((feature) => {
          const id = String(feature.id);
          const name = typeof feature.properties.name === "string" ? feature.properties.name : id;
          return (
            <FeatureListRow
              key={id}
              id={id}
              name={name}
              features={features}
              pressed={selectedFeature === id}
              linked={highlightedFeatureIds.includes(id)}
              linking={linking}
              hovered={hoverFeature === id}
              onPress={() => {
                if (linking) toggleLinkedFeature(id);
                else {
                  setTool("pointer");
                  setSelectedFeature(id);
                }
              }}
              onHoverStart={() => setHoverFeature(id)}
              onHoverEnd={() => setHoverFeature(null)}
            />
          );
        })}
      </div>
    </>
  );
}
