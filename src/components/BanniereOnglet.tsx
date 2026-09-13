import type { LucideIcon } from "lucide-react";

/**
 * Bandeau d'en-tête affiché en haut de chaque onglet de l'espace formateur.
 * Purement graphique (aucune image à charger) : dégradé de la charte Formatrix,
 * icône de l'onglet et liseré or.
 */
export function BanniereOnglet({
  titre,
  description,
  icone: Icone,
}: {
  titre: string;
  description?: string;
  icone: LucideIcon;
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-lg border">
      <div className="relative flex items-center gap-4 bg-gradient-to-r from-primary to-primary/80 px-5 py-6">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_top_right,rgba(253,224,5,0.25),transparent_70%)]"
        />
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10 ring-1 ring-primary-foreground/25">
          <Icone className="h-6 w-6 text-primary-foreground" />
        </span>
        <div className="relative">
          <h1 className="text-xl font-bold uppercase tracking-wide text-primary-foreground">
            {titre}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-primary-foreground/80">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="h-1 w-full bg-[#FDE005]" />
    </section>
  );
}
