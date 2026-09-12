export function EnTeteFormatrix({
  titre,
  sousTitre,
}: {
  titre: string;
  sousTitre?: string;
}) {
  return (
    <header className="flex items-stretch gap-4">
      <img
        src="/logo.png"
        alt="Formatrix — Back to Business"
        className="h-14 w-auto"
      />
      <div className="w-0.5 bg-primary" aria-hidden="true" />
      <div className="flex flex-col justify-center">
        <p className="text-lg font-bold uppercase tracking-wide text-primary">
          {titre}
        </p>
        {sousTitre ? (
          <p className="text-sm text-muted-foreground">{sousTitre}</p>
        ) : null}
      </div>
    </header>
  );
}
