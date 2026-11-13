"use client";

/*
 * The features command sidebar.
 * A row selects that polygon. Hovering a row hovers it on the map.
 */

import { useEffect } from "react";
import { mapPanel, useMap } from "../../map-context";
import { FeatureName } from "../feature-name";

// The feature list for the open map.
export function FeatureCommand() {
  const { features, selectedFeature, setSelectedFeature, hoverFeature, setHoverFeature, setTool } = useMap();

  useEffect(() => {
    return () => setHoverFeature(null);
  }, [setHoverFeature]);

  return (
    <>
      <div className="flex shrink-0 items-center border-b border-surface-translucent-placeholder px-4 py-4">
        <p className="template-body-medium-emphasized whitespace-nowrap text-text-primary">
          {mapPanel.features}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {features.map((feature) => {
          const id = String(feature.id);
          const selected = selectedFeature === id;
          const hovered = hoverFeature === id;
          const name = typeof feature.properties.name === "string" ? feature.properties.name : id;
          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onMouseEnter={() => setHoverFeature(id)}
              onMouseLeave={() => setHoverFeature(null)}
              onClick={() => {
                setTool("pointer");
                setSelectedFeature(id);
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setTool("pointer");
                setSelectedFeature(id);
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 overflow-hidden px-4 text-left transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary hover:bg-surface-translucent-placeholder-2 ${selected || hovered ? "bg-surface-translucent-placeholder-2" : ""}`}
            >
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0 bg-surface-header [mask-image:url(/icons/map/pentagon.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
              />
              <div className="min-w-0 flex-1">
                <FeatureName
                  id={id}
                  name={name}
                  features={features}
                  activate="double-click"
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
