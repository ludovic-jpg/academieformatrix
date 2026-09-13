import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Eye,
  Layers,
  Loader2,
  Package,
  Sparkles,
} from "lucide-react";

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
import { construirePptxEnrichi } from "@/lib/supports/pptx";
import { construireSupportPdf } from "@/lib/supports/export";
import { construireScorm } from "@/lib/supports/scorm";
import type { ModuleCours } from "@/lib/supports/cours";
import { genererCoursApprofondi } from "@/lib/cours-claude.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const genererCoursFn = useServerFn(genererCoursApprofondi);
  const [coursEnrichi, setCoursEnrichi] = useState<ModuleCours[]>([]);

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

  /** Dépose un fichier généré dans le coffre-fort du parcours. */
  const deposerAuCoffre = async (
    nom: string,
    blob: Blob,
    userId: string,
    idFormation: string,
  ) => {
    const chemin = `${userId}/${idFormation}/${Date.now()}-${nomFichierSur(nom)}`;
    const { error: erreurDepot } = await supabase.storage
      .from("coffre")
      .upload(chemin, blob);
    if (erreurDepot) throw new Error(erreurDepot.message);
    const { error: erreurLigne } = await supabase
        .from("coffre_fichiers")
        .insert({
          formateur_id: userId,
          formation_id: idFormation,
          nom,
          chemin,
          taille: blob.size,
        });
    if (erreurLigne) throw new Error(erreurLigne.message);
  };

  /**
   * Recherche théorique approfondie module par module, puis production
   * des PowerPoint enrichis et du paquet SCORM 1.2 du parcours.
   */
  const lancerRechercheClaude = async () => {
    if (!formation) return;
    setErreur(null);
    setEnCours("claude");
    setCoursEnrichi([]);
    try {
      const { data: utilisateur } = await supabase.auth.getUser();
      if (!utilisateur.user) {
        throw new Error("Votre session a expiré, reconnectez-vous.");
      }
      const produits: ModuleCours[] = [];
      for (let i = 0; i < modules.length; i += 1) {
        const mod = modules[i]!;
        setProgression(
          `Recherche théorique — module ${i + 1}/${modules.length} : ${mod.titre}`,
        );
        const moduleCours = await genererCoursFn({
          data: {
            titreFormation: formation.titre,
            publicCible: formation.programme?.publicConcerne ?? "",
            module: { titre: mod.titre, points: mod.points ?? [] },
          },
        });
        produits.push(moduleCours);
        setCoursEnrichi([...produits]);

        const pptx = await construirePptxEnrichi(
          formation.titre,
          moduleCours,
          i + 1,
        );
        await deposerAuCoffre(
          `Parcours de formation - ${formation.titre} - Module ${i + 1} - ${moduleCours.title} - Approfondi.pptx`,
          pptx,
          utilisateur.user.id,
          formation.id,
        );
        await chargerFichiers(formation.id);
      }

      setProgression("Assemblage du module SCORM 1.2…");
      const zip = await construireScorm({
        titreFormation: formation.titre,
        modules: produits,
      });
      await deposerAuCoffre(
        `Parcours de formation - ${formation.titre} - Module e-learning SCORM 1.2.zip`,
        zip,
        utilisateur.user.id,
        formation.id,
      );
      await chargerFichiers(formation.id);
    } catch (e) {
      setErreur(
        e instanceof Error
          ? e.message
          : "La recherche théorique et la génération ont échoué.",
      );
    } finally {
      setProgression(null);
      setEnCours(null);
    }
  };

  const fichiersParModule = fichiers.reduce((acc, f) => {
    const match = f.nom.match(/Module ([0-9]+)/);
    const mod = match ? "Module " + match[1] : "Général";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(f);
    return acc;
  }, {} as Record<string, typeof fichiers>);

  const contenuClassique = (
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
              Tous les supports de ce parcours, regroupés par module.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fichiers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun support généré pour l'instant.
              </p>
            )}
            {Object.entries(fichiersParModule).map(([mod, fs]) => (
              <div key={mod} className="space-y-3">
                <h3 className="text-sm font-bold text-primary border-b pb-1">{mod}</h3>
                <div className="grid gap-2">
                  {fs.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border p-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex-1 text-sm">{f.nom}</span>
                      <div className="flex gap-2">
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
                    </div>
                  ))}
                </div>
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

  return (
    <Tabs defaultValue="classique" className="space-y-6">
      <TabsList>
        <TabsTrigger value="classique">Supports PowerPoint</TabsTrigger>
        <TabsTrigger value="scorm">
          Générateur SCORM 1.2 &amp; PPT amélioré
        </TabsTrigger>
      </TabsList>

      <TabsContent value="classique">{contenuClassique}</TabsContent>

      <TabsContent value="scorm" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Générateur SCORM 1.2 &amp; PPT amélioré</CardTitle>
            <CardDescription>
              L'assistant mène une recherche théorique approfondie sur chaque module pour produire un contenu riche, un PowerPoint "premium" et un paquet SCORM interactif.
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
            {formation && (
              <Button
                variant="default"
                disabled={enCours !== null || modules.length === 0}
                onClick={lancerRechercheClaude}
              >
                {enCours === "claude" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Lancer la recherche théorique &amp; génération SCORM
              </Button>
            )}
            {progression && (
              <p className="text-sm text-muted-foreground">{progression}</p>
            )}
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          </CardContent>
        </Card>

        {coursEnrichi.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {coursEnrichi.map((m, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Module {i + 1} : {m.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {m.slides.length} diapositives approfondies générées.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
