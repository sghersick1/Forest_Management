import { LogoPlaceholder } from "@/app/components/header/logo-placeholder";

export const mapNavWidth = 64;

const items = ["Layers", "Actions", "Parcels"] as const;

const iconWell =
  "rounded-[8px] p-1.5 transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder";

export function MapNav() {
  return (
    <nav
      aria-label="Map"
      style={{ width: mapNavWidth }}
      className="absolute inset-y-0 left-0 z-10 flex flex-col items-center gap-3 border-r border-border-map bg-surface-canvas pt-3"
    >
      <LogoPlaceholder />
      {items.map((label) => (
        <div key={label} className="flex flex-col items-center gap-0.5">
          <div className={iconWell}>
            <div
              aria-hidden="true"
              className="size-7 border border-text-primary bg-transparent"
            />
          </div>
          <span className="template-body-small text-text-primary">
            {label}
          </span>
        </div>
      ))}
    </nav>
  );
}
