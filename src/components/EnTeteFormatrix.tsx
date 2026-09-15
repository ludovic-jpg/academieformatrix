export function EnTeteFormatrix({
  titre,
  sousTitre,
}: {
  titre: string;
  sousTitre?: string;
}) {
  return (
    <header className="flex w-full items-stretch gap-6">
      <img
        src="/logo.png"
        alt="Formatrix — Back to Business"
        className="h-20 w-auto"
      />
      <div className="w-0.5 bg-primary" aria-hidden="true" />
      <div className="flex flex-col justify-center">
        <p className="text-2xl font-bold uppercase tracking-wide text-primary">
          {titre}
        </p>
        {sousTitre ? (
          <p className="text-base text-muted-foreground">{sousTitre}</p>
        ) : null}
      </div>
    </header>
  );
}
