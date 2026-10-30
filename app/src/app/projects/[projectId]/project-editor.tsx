const projectFields = [
  "John Doe",
  "724.831.0942",
  "xyz@gmail.com",
  "Holden Forests & Gardens",
  "9550 Sperry Rd, Kirtland, OH 44094",
] as const;

export function ProjectEditor({ title }: { title: string }) {
  return (
    <main className="flex min-h-0 flex-1 bg-surface-canvas">
      <section className="flex min-w-0 flex-1 flex-col gap-8 p-8">
        <div className="flex flex-col gap-2">
          <h1 className="template-headline-medium whitespace-nowrap text-text-primary">
            {title}
          </h1>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
            {projectFields.map((value) => (
              <ProjectField key={value} value={value} />
            ))}
          </div>
        </div>
        <div className="h-[512px] w-full border border-border-map" />
      </section>
      <aside className="flex w-[379px] shrink-0 flex-col gap-8 self-stretch overflow-hidden border-l border-border-map bg-surface-translucent-placeholder-2 p-4">
        <div className="flex w-full items-center justify-between">
          <div className="px-2">
            <div className="flex items-center justify-center py-1">
              <h2 className="template-body-large whitespace-nowrap text-text-primary">
                Timeline
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Search timeline"
              className="flex size-6 items-center justify-center bg-transparent p-0"
            >
              <img
                src="/icons/timeline-search.svg"
                alt=""
                width={12.9998}
                height={12.9999}
              />
            </button>
            <button
              type="button"
              aria-label="Add timeline entry"
              className="flex size-6 items-center justify-center rounded-[2px] bg-transparent py-0.5"
            >
              <span className="flex size-3.5 items-center justify-center text-[24px] leading-[0.6] font-extralight tracking-normal text-text-primary">
                +
              </span>
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}

function ProjectField({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span aria-hidden="true" className="size-4 shrink-0 bg-surface-neutral" />
      <span className="template-body-large whitespace-nowrap text-text-secondary">
        {value}
      </span>
    </div>
  );
}
