import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
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

interface FichierSupport {
  id: string;
  nom: string;
  chemin: string;
  created_at: string;
}

const PARTIES = ["theorie", "exercices"] as const;

function Supports() {
  const genererSupportFn = useServerFn(genererSupport);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formationId, setFormationId] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [progression, setProgression] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fichiers, setFichiers] = useState<FichierSupport[]>([]);

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

  /** Liste les supports déjà déposés dans le coffre-fort du parcours. */
  const chargerFichiers = useCallback(async (idFormation: string) => {
    if (!idFormation) {
      setFichiers([]);
      return;
    }
    const { data } = await supabase
      .from("coffre_fichiers")
      .select("id, nom, chemin, created_at")
      .eq("formation_id", idFormation)
      .order("created_at", { ascending: false });
    const tous = (data ?? []) as unknown as FichierSupport[];
    setFichiers(tous.filter((f) => f.nom.startsWith("Parcours de formation - ")));
  }, []);

  useEffect(() => {
    void chargerFichiers(formationId);
  }, [formationId, chargerFichiers]);

  const formation = formations.find((f) => f.id === formationId) ?? null;
  const modules = formation?.programme?.modules ?? [];

  const ouvrir = async (fichier: FichierSupport, telechargement: boolean) => {
    const { data, error } = await supabase.storage
      .from("coffre")
      .createSignedUrl(
        fichier.chemin,
        300,
        telechargement ? { download: fichier.nom } : undefined,
      );
    if (error || !data) {
      setErreur("Impossible d'ouvrir ce support pour le moment.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  /** Génère un support (théorie ou exercices) et le dépose dans le coffre-fort. */
  const produireUn = async (
    indexModule: number,
    partie: (typeof PARTIES)[number],
  ) => {
    if (!formation) return;
    const mod = modules[indexModule];
    if (!mod) return;

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
  };

  const produire = async (
    indexModule: number,
    partie: (typeof PARTIES)[number],
  ) => {
    setErreur(null);
    setEnCours(`${indexModule}-${partie}`);
    try {
      await produireUn(indexModule, partie);
      await chargerFichiers(formationId);
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "La génération du support a échoué.",
      );
    } finally {
      setEnCours(null);
    }
  };

  /** Génère d'un seul coup les deux supports de chacun des modules du parcours. */
  const produireTout = async () => {
    setErreur(null);
    setEnCours("tout");
    const total = modules.length * PARTIES.length;
    let fait = 0;
    try {
      for (let i = 0; i < modules.length; i += 1) {
        for (const partie of PARTIES) {
          fait += 1;
          setProgression(
            `Module ${i + 1} — ${libellePartie(partie).toLowerCase()} (${fait}/${total})`,
          );
          await produireUn(i, partie);
          await chargerFichiers(formationId);
        }
      }
    } catch (e) {
      setErreur(
        e instanceof Error
          ? e.message
          : "La génération de l'ensemble des supports a échoué.",
      );
    } finally {
      setProgression(null);
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
          {modules.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={enCours !== null} onClick={produireTout}>
                {enCours === "tout" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Layers className="mr-2 h-4 w-4" />
                )}
                Générer les supports de l'ensemble de la formation
              </Button>
              {progression && (
                <span className="text-sm text-muted-foreground">
                  En cours : {progression}
                </span>
              )}
            </div>
          )}
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        </CardContent>
      </Card>

      {formation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supports déjà créés</CardTitle>
            <CardDescription>
              Tous les supports de ce parcours, consultables et téléchargeables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {fichiers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun support généré pour l'instant.
              </p>
            )}
            {fichiers.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-2 rounded-md border p-3"
              >
                <span className="flex-1 text-sm">{f.nom}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => ouvrir(f, false)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Aperçu
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => ouvrir(f, true)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
          <CardContent>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
