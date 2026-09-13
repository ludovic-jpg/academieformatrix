import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SupportCoursDossier } from "@/lib/dossier.functions";

export function LecteurCours({ supports }: { supports: SupportCoursDossier[] }) {
  const pages = useMemo(
    () => supports.flatMap((support) => support.contenu.slides.map((slide) => ({ support, slide }))),
    [supports],
  );
  const [index, setIndex] = useState(0);
  const page = pages[index];

  if (!page) {
    return <p className="text-sm text-muted-foreground">Le cours interactif n’est pas encore disponible.</p>;
  }

  const progression = Math.round(((index + 1) / pages.length) * 100);
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Module {page.support.numeroModule} — {page.support.titreModule}</span>
          <span>{index + 1} / {pages.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progression}%` }} />
        </div>
      </div>
      <article className="min-h-[28rem] rounded-md border bg-card p-5 sm:p-8">
        <p className="text-xs font-bold uppercase text-primary">Module {page.support.numeroModule}</p>
        <h2 className="mt-2 text-2xl font-bold text-primary">{page.slide.title}</h2>
        <div className="mt-5 whitespace-pre-line text-sm leading-7">{page.slide.content}</div>
        {page.slide.keyTakeaways.length > 0 && (
          <div className="mt-6 rounded-md bg-muted p-4">
            <p className="text-sm font-bold text-primary">À retenir</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {page.slide.keyTakeaways.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
        )}
      </article>
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
        </Button>
        <Button disabled={index === pages.length - 1} onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}>
          Suivant <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}