"use client";

/*
 * Details for the selected feature.
 * The sidebar frame mounts this only while a feature is selected.
 */

import { useMap } from "../../map-context";
import { FeatureName } from "../feature-name";
import { polygonAcres } from "../polygon-acres";

// Name and acreage for the selected polygon.
export function FeatureDetails() {
  const { features, selectedFeature } = useMap();
  if (selectedFeature === null) return null;

  const feature = features.find((item) => String(item.id) === selectedFeature);
  const featureName = typeof feature?.properties.name === "string" ? feature.properties.name : "";
  const acres = polygonAcres(feature);

  return (
    <div className="flex w-full shrink-0 items-center gap-1 border-b border-surface-translucent-placeholder p-2">
      <div className="min-w-0 flex-1">
        <FeatureName
          key={selectedFeature}
          id={selectedFeature}
          name={featureName}
          features={features}
          activate="click"
        />
      </div>
      {acres !== null ? (
        <p className="template-body-small shrink-0 pr-2 text-text-secondary tabular-nums">
          {acreageLabel(acres)}
        </p>
      ) : null}
    </div>
  );
}

// One decimal and the unit, matching the header's secondary acreage.
function acreageLabel(acres: number) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(acres)} acres`;
}
