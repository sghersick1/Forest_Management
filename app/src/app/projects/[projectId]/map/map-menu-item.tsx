export function MapMenuItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-0.25">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[4px] transition-colors duration-200 ease-in-out hover:bg-surface-translucent-placeholder-2">
        {children}
      </div>
      <span className="template-label-small font-normal! whitespace-nowrap text-text-primary">
        {label}
      </span>
    </div>
  );
}
