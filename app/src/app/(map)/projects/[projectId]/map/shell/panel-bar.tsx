/*
 * The narrow bar of map panels on the left of the map.
 */

import Link from "next/link";
import { Panel } from "./panel";

export const mapNavWidth = 64;

// Home link and the feature, action, soil, and parcel panel buttons.
export function PanelBar() {
  return (
    <nav
      aria-label="Map"
      style={{ width: mapNavWidth }}
      className="absolute inset-y-0 left-0 z-10 flex flex-col items-center gap-2 border-r border-border-map bg-surface-canvas p-2.5"
    >
      <Link
        href="/"
        aria-label="Home"
        className="flex size-10 shrink-0 items-center justify-center rounded-[4px] transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder-2"
      >
        <img src="/icons/map/logo.png" alt="" width={24} height={28} />
      </Link>
      <img src="/icons/map/divider.svg" alt="" className="shrink-0" />
      <Panel id="features" label="Features">
        <img src="/icons/map/layers.svg" alt="" className="shrink-0" />
      </Panel>
      <Panel id="actions" label="Actions">
        <img src="/icons/map/actions.svg" alt="" className="shrink-0" />
      </Panel>
      <img src="/icons/map/divider.svg" alt="" className="shrink-0" />
      <Panel id="soils" label="Soils">
        <img src="/icons/map/grain.svg" alt="" width={24} height={24} className="shrink-0" />
      </Panel>
      <Panel id="parcels" label="Parcels">
        <img src="/icons/map/box-seam.svg" alt="" width={20} height={20} className="shrink-0" />
      </Panel>
    </nav>
  );
}
