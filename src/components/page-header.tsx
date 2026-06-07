export function PageHeader({
  baslik,
  children,
}: {
  baslik: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{baslik}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
