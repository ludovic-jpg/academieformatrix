import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Download, Eye, Layers, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { genererSupport } from "@/lib/supports.functions";
import {
  construirePptx,
  libellePartie,
  nomSupport,
  type DeckSupport,
} from "@/lib/supports/pptx";
import { construireSupportPdf } from "@/lib/supports/export";
import { nomFichierSur } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/intranet/supports")({
  component: Supports,
  head: () => ({
    meta: [
      { title: "Mes supports de formation | Espace formateur Formatrix" },
      {
        name: "description",
        content:
          "Générez automatiquement les supports PowerPoint théoriques et pratiques de chaque module de vos parcours de formation.",
      },
      { property: "og:title", content: "Mes supports de formation — Formatrix" },
      {
        property: "og:description",
        content:
          "Génération IA des supports PowerPoint et PDF par module, déposés dans le coffre-fort pédagogique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

interface ModuleProgramme {
  titre: string;
  points: string[];
}

interface Formation {
  id: string;
  titre: string;
  niveau: string;
  programme: {
    modules?: ModuleProgramme[];
    publicConcerne?: string;
  } | null;
}

interface SupportGenere {
  cle: string;
  nom: string;
  pptx: Blob;
  pdf: Blob;
}

interface FichierSupport {
  id: string;
  nom: string;
  chemin: string;
  created_at: string;
}

const PARTIES = ["theorie", "exercices"] as const;

function telecharger(blob: Blob, nomFichier: string) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}

function Supports() {
  const genererSupportFn = useServerFn(genererSupport);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formationId, setFormationId] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [supports, setSupports] = useState<SupportGenere[]>([]);

  useEffect(() => {
    (async () => {
      const { data: utilisateur } = await supabase.auth.getUser();
      if (!utilisateur.user) return;
      const { data } = await supabase
        .from("formations")
        .select("id, titre, niveau, programme")
        .eq("formateur_id", utilisateur.user.id)
        .order("created_at", { ascending: false });
      setFormations((data ?? []) as unknown as Formation[]);
    })();
  }, []);

  const formation = formations.find((f) => f.id === formationId) ?? null;
  const modules = formation?.programme?.modules ?? [];

  const produire = async (
    indexModule: number,
    partie: (typeof PARTIES)[number],
  ) => {
    if (!formation) return;
    const mod = modules[indexModule];
    if (!mod) return;
    const cle = `${indexModule}-${partie}`;
    setErreur(null);
    setEnCours(cle);
    try {
      const { data: utilisateur } = await supabase.auth.getUser();
      if (!utilisateur.user) {
        throw new Error("Votre session a expiré, reconnectez-vous.");
      }

      const contenu = await genererSupportFn({
        data: {
          titreParcours: formation.titre,
          numeroModule: indexModule + 1,
          titreModule: mod.titre,
          points: mod.points ?? [],
          niveau: formation.niveau ?? "",
          publicConcerne: formation.programme?.publicConcerne ?? "",
          partie,
        },
      });

      const deck: DeckSupport = {
        titreParcours: formation.titre,
        numeroModule: indexModule + 1,
        titreModule: mod.titre,
        partie,
        slides: contenu.slides,
      };
      const nom = nomSupport(deck);
      const [pptx, pdf] = await Promise.all([
        construirePptx(deck),
        construireSupportPdf(deck),
      ]);

      // Dépôt automatique dans le coffre-fort pédagogique du parcours.
      for (const [blob, extension] of [
        [pptx, "pptx"],
        [pdf, "pdf"],
      ] as const) {
        const chemin = `${utilisateur.user.id}/${formation.id}/${Date.now()}-${nomFichierSur(`${nom}.${extension}`)}`;
        const { error: erreurDepot } = await supabase.storage
          .from("coffre")
          .upload(chemin, blob);
        if (erreurDepot) throw new Error(erreurDepot.message);
        const { error: erreurLigne } = await supabase
          .from("coffre_fichiers")
          .insert({
            formateur_id: utilisateur.user.id,
            formation_id: formation.id,
            nom: `${nom}.${extension}`,
            chemin,
            taille: blob.size,
          });
        if (erreurLigne) throw new Error(erreurLigne.message);
      }

      setSupports((anciens) => [
        { cle, nom, pptx, pdf },
        ...anciens.filter((s) => s.cle !== cle),
      ]);
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "La génération du support a échoué.",
      );
    } finally {
      setEnCours(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mes supports de formation</CardTitle>
          <CardDescription>
            Choisissez un parcours : pour chaque module, l'assistant pédagogique
            produit un support théorique et un support d'exercices de 15
            diapositives, en PowerPoint et en PDF, déposés automatiquement dans
            le coffre-fort pédagogique du parcours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Parcours de formation</Label>
            <Select value={formationId} onValueChange={setFormationId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un parcours" />
              </SelectTrigger>
              <SelectContent>
                {formations.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        </CardContent>
      </Card>

      {formation && modules.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Ce parcours ne contient aucun module.
        </p>
      )}

      {modules.map((mod, index) => (
        <Card key={`${mod.titre}-${index}`}>
          <CardHeader>
            <CardTitle className="text-base">
              Module {index + 1} — {mod.titre}
            </CardTitle>
            <CardDescription>
              {(mod.points ?? []).slice(0, 4).join(" • ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PARTIES.map((partie) => (
                <Button
                  key={partie}
                  variant="outline"
                  size="sm"
                  disabled={enCours !== null}
                  onClick={() => produire(index, partie)}
                >
                  {enCours === `${index}-${partie}` ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Générer le support {libellePartie(partie).toLowerCase()}
                </Button>
              ))}
            </div>
            {supports
              .filter((s) => s.cle.startsWith(`${index}-`))
              .map((s) => (
                <div
                  key={s.cle}
                  className="flex flex-wrap items-center gap-2 rounded-md border p-3"
                >
                  <span className="flex-1 text-sm">{s.nom}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => telecharger(s.pptx, `${s.nom}.pptx`)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PowerPoint
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => telecharger(s.pdf, `${s.nom}.pdf`)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
