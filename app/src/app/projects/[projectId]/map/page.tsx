import { Map } from "@/app/components/map/map";

export default function ProjectMapPage() {
  return (
    <main className="min-h-0 flex-1">
      <Map interactive={true} />
    </main>
  );
}
