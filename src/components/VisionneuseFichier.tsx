import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ApercuFichier {
  titre: string;
  url: string;
}

/** Visionneuse en incrustation (PDF ou paquet SCORM prévisualisé) sans quitter la page. */
export function VisionneuseFichier({
  apercu,
  onFermer,
}: {
  apercu: ApercuFichier | null;
  onFermer: () => void;
}) {
  return (
    <Dialog open={apercu !== null} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col p-4">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
          <DialogTitle className="truncate text-base">{apercu?.titre ?? "Aperçu"}</DialogTitle>
          {apercu && (
            <Button variant="outline" size="sm" asChild>
              <a href={apercu.url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Nouvel onglet
              </a>
            </Button>
          )}
        </DialogHeader>
        {apercu && (
          <iframe
            src={apercu.url}
            title={apercu.titre}
            className="min-h-0 flex-1 rounded-md border"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
