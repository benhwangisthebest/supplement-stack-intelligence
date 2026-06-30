// Standard pillar-page header: display heading + lead paragraph.
export function PageHeader({
  title,
  lead,
}: {
  title: string;
  lead?: string;
}) {
  return (
    <header>
      <h1 className="display-md">{title}</h1>
      {lead && <p className="mt-3 max-w-2xl text-body">{lead}</p>}
    </header>
  );
}
