import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Eye, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EnTeteFormatrix } from "@/components/EnTeteFormatrix";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VisionneuseFichier, type ApercuFichier } from "@/components/VisionneuseFichier";
import { construireApercuScorm } from "@/lib/supports/scormPreview";
import { consulterPartage } from "@/lib/partage.functions";

export const Route = createFileRoute("/partage/$jeton")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Supports de formation partagés — Formatrix" },
      {
        name: "description",
        content:
          "Consultation en lecture seule des supports pédagogiques partagés par votre formateur Formatrix.",
      },
      { property: "og:title", content: "Supports partagés — Formatrix" },
      {
        property: "og:description",
        content: "Documents mis à disposition par votre formateur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Partage,
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">Ce lien de partage n'est plus valide.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">Partage introuvable.</p>
    </div>
  ),
});

function formatTaille(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

interface FichierPartageAffiche {
  id: string;
  nom: string;
  taille: number;
  url: string;
}

function LigneFichier({
  fichier,
  chargement,
  onApercu,
}: {
  fichier: FichierPartageAffiche;
  chargement: boolean;
  onApercu: (fichier: FichierPartageAffiche) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
      <div className="min-w-0">
        <p className="truncate">{fichier.nom}</p>
        <p className="text-xs text-muted-foreground">{formatTaille(fichier.taille)}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Aperçu de ${fichier.nom}`}
          disabled={chargement}
          onClick={() => onApercu(fichier)}
        >
          {chargement ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4 text-primary" />
          )}
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Télécharger ${fichier.nom}`} asChild>
          <a href={fichier.url} target="_blank" rel="noreferrer">
            <Download className="h-4 w-4 text-primary" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function Partage() {
  const { jeton } = Route.useParams();
  const consulter = useServerFn(consulterPartage);
  const { data, isLoading, error } = useQuery({
    queryKey: ["partage", jeton],
    queryFn: () => consulter({ data: { jeton } }),
    retry: false,
  });

  const [apercu, setApercu] = useState<ApercuFichier | null>(null);
  const [apercuUrlObjet, setApercuUrlObjet] = useState<string | null>(null);
  const [chargementApercu, setChargementApercu] = useState<string | null>(null);
  const [erreurApercu, setErreurApercu] = useState<string | null>(null);

  const fermerApercu = () => {
    if (apercuUrlObjet) URL.revokeObjectURL(apercuUrlObjet);
    setApercuUrlObjet(null);
    setApercu(null);
  };

  /**
   * Visionneuse en incrustation : les PDF s'affichent via leur URL signée ;
   * le paquet SCORM est dézippé puis reconstruit en page HTML autonome.
   */
  const previsualiser = async (fichier: FichierPartageAffiche) => {
    setErreurApercu(null);
    setChargementApercu(fichier.id);
    try {
      if (/\.zip$/i.test(fichier.nom)) {
        const reponse = await fetch(fichier.url);
        if (!reponse.ok) throw new Error("Le paquet n'a pas pu être téléchargé pour aperçu.");
        const html = await construireApercuScorm(await reponse.blob());
        const urlObjet = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        setApercuUrlObjet(urlObjet);
        setApercu({ titre: fichier.nom, url: urlObjet });
      } else {
        setApercu({ titre: fichier.nom, url: fichier.url });
      }
    } catch (e) {
      setErreurApercu(e instanceof Error ? e.message : "Impossible de prévisualiser ce fichier.");
    } finally {
      setChargementApercu(null);
    }
  };

  const fichiersGeneraux = (data?.fichiers ?? []).filter((f) => f.numeroModule === null);

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <EnTeteFormatrix titre="Supports de formation" sousTitre="Consultation en lecture seule" />

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">{data?.titreFormation ?? "Formation"}</CardTitle>
            <CardDescription>
              Documents mis à disposition par votre formateur, classés par module.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">Ce lien de partage n'est plus valide.</p>
            )}
            {data && data.fichiers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun document partagé pour le moment.
              </p>
            )}
            {erreurApercu && <p className="text-sm text-destructive">{erreurApercu}</p>}
          </CardContent>
        </Card>

        {data?.modules.map((mod, index) => {
          const liste = data.fichiers.filter((f) => f.numeroModule === index + 1);
          if (liste.length === 0) return null;
          return (
            <Card key={`${mod.titre}-${index}`}>
              <CardHeader>
                <CardTitle className="text-base text-primary">
                  Module {index + 1} — {mod.titre}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {liste.map((fichier) => (
                  <LigneFichier
                    key={fichier.id}
                    fichier={fichier}
                    chargement={chargementApercu === fichier.id}
                    onApercu={previsualiser}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}

        {fichiersGeneraux.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-primary">Documents généraux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {fichiersGeneraux.map((fichier) => (
                <LigneFichier
                  key={fichier.id}
                  fichier={fichier}
                  chargement={chargementApercu === fichier.id}
                  onApercu={previsualiser}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <VisionneuseFichier apercu={apercu} onFermer={fermerApercu} />
    </div>
  );
}
