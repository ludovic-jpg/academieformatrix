import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";

import { EnTeteFormatrix } from "@/components/EnTeteFormatrix";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function LienFichier({
  fichier,
}: {
  fichier: { id: string; nom: string; taille: number; url: string };
}) {
  return (
    <a
      href={fichier.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-accent"
    >
      <div className="min-w-0">
        <p className="truncate">{fichier.nom}</p>
        <p className="text-xs text-muted-foreground">{formatTaille(fichier.taille)}</p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-primary" />
    </a>
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
                  <LienFichier key={fichier.id} fichier={fichier} />
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
                <LienFichier key={fichier.id} fichier={fichier} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
