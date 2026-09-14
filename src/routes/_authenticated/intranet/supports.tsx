import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, Download, Eye, Layers, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { construirePptx, libellePartie, nomSupport, type DeckSupport } from "@/lib/supports/pptx";
import { construireSupportPdf } from "@/lib/supports/export";
import type { ModuleCours } from "@/lib/supports/cours";
import type { Json } from "@/integrations/supabase/types";
import { genererCoursApprofondi } from "@/lib/cours-claude.functions";
import { nomFichierSur } from "@/lib/storage";
import { telechargerBlob } from "@/lib/documents";
import { VisionneuseFichier, type ApercuFichier } from "@/components/VisionneuseFichier";

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
          "Génération IA des supports PowerPoint et PDF par module ; seuls les PDF sont archivés dans le coffre-fort pédagogique.",
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
  const genererCoursFn = useServerFn(genererCoursApprofondi);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formationId, setFormationId] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [progression, setProgression] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fichiers, setFichiers] = useState<FichierSupport[]>([]);
  const [coursEnrichi, setCoursEnrichi] = useState<ModuleCours[]>([]);
  const [apercu, setApercu] = useState<ApercuFichier | null>(null);
  const [chargementApercu, setChargementApercu] = useState<string | null>(null);

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
    // Le coffre-fort ne conserve que les PDF : les PowerPoint sont
    // téléchargés directement, jamais archivés (voir produireUn).
    setFichiers(
      tous.filter((f) => f.nom.startsWith("Parcours de formation - ") && !/\.pptx?$/i.test(f.nom)),
    );
  }, []);

  useEffect(() => {
    void chargerFichiers(formationId);
  }, [formationId, chargerFichiers]);

  const formation = formations.find((f) => f.id === formationId) ?? null;
  const modules = formation?.programme?.modules ?? [];

  const telecharger = async (fichier: FichierSupport) => {
    const { data, error } = await supabase.storage
      .from("coffre")
      .createSignedUrl(fichier.chemin, 300, { download: fichier.nom });
    if (error || !data) {
      setErreur("Impossible de télécharger ce support pour le moment.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  /** Visionneuse en incrustation : le PDF s'affiche via son URL signée. */
  const previsualiser = async (fichier: FichierSupport) => {
    setErreur(null);
    setChargementApercu(fichier.id);
    try {
      const { data, error } = await supabase.storage
        .from("coffre")
        .createSignedUrl(fichier.chemin, 300);
      if (error || !data) throw new Error("Impossible d'ouvrir ce support pour le moment.");
      setApercu({ titre: fichier.nom, url: data.signedUrl });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de prévisualiser ce support.");
    } finally {
      setChargementApercu(null);
    }
  };

  /**
   * Génère un support (théorie ou exercices) : seul le PDF est déposé dans
   * le coffre-fort pédagogique (qui ne doit contenir que des PDF) ; le
   * PowerPoint, lui, est retourné à l'appelant pour être téléchargé
   * directement, jamais archivé.
   */
  const produireUn = async (
    indexModule: number,
    partie: (typeof PARTIES)[number],
  ): Promise<{ nom: string; pptx: Blob }> => {
    if (!formation) throw new Error("Aucun parcours sélectionné.");
    const mod = modules[indexModule];
    if (!mod) throw new Error("Module introuvable.");

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
    const [pptx, pdf] = await Promise.all([construirePptx(deck), construireSupportPdf(deck)]);

    const chemin = `${utilisateur.user.id}/${formation.id}/${Date.now()}-${nomFichierSur(`${nom}.pdf`)}`;
    const { error: erreurDepot } = await supabase.storage.from("coffre").upload(chemin, pdf);
    if (erreurDepot) throw new Error(erreurDepot.message);
    const { error: erreurLigne } = await supabase.from("coffre_fichiers").insert({
      formateur_id: utilisateur.user.id,
      formation_id: formation.id,
      nom: `${nom}.pdf`,
      chemin,
      taille: pdf.size,
    });
    if (erreurLigne) throw new Error(erreurLigne.message);

    return { nom: `${nom}.pptx`, pptx };
  };

  const produire = async (indexModule: number, partie: (typeof PARTIES)[number]) => {
    setErreur(null);
    setEnCours(`${indexModule}-${partie}`);
    try {
      const { nom, pptx } = await produireUn(indexModule, partie);
      telechargerBlob(nom, pptx);
      await chargerFichiers(formationId);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La génération du support a échoué.");
    } finally {
      setEnCours(null);
    }
  };

  /**
   * Génère d'un seul coup les deux supports de chacun des modules du
   * parcours. Les PDF sont déposés au coffre-fort au fil de l'eau ; les
   * PowerPoint sont regroupés dans une seule archive ZIP téléchargée à
   * la fin, pour éviter d'enchaîner des dizaines de téléchargements.
   */
  const produireTout = async () => {
    setErreur(null);
    setEnCours("tout");
    const total = modules.length * PARTIES.length;
    let fait = 0;
    const pptxCollectes: { nom: string; pptx: Blob }[] = [];
    try {
      for (let i = 0; i < modules.length; i += 1) {
        for (const partie of PARTIES) {
          fait += 1;
          setProgression(
            `Module ${i + 1} — ${libellePartie(partie).toLowerCase()} (${fait}/${total})`,
          );
          pptxCollectes.push(await produireUn(i, partie));
          await chargerFichiers(formationId);
        }
      }
      if (pptxCollectes.length > 0) {
        setProgression("Préparation de l'archive PowerPoint…");
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (const { nom, pptx } of pptxCollectes) zip.file(nom, pptx);
        const archive = await zip.generateAsync({ type: "blob" });
        telechargerBlob(`Supports PowerPoint - ${formation?.titre ?? ""}.zip`, archive);
      }
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "La génération de l'ensemble des supports a échoué.",
      );
    } finally {
      setProgression(null);
      setEnCours(null);
    }
  };

  /**
   * Recherche théorique approfondie module par module : enrichit le
   * contenu affiché aux apprenants dans leur espace personnel (cours
   * interactif). Ne produit ni PowerPoint ni export : uniquement les
   * données du cours, enregistrées en base.
   */
  const genererContenuApprenant = async () => {
    if (!formation) return;
    setErreur(null);
    setEnCours("cours");
    setCoursEnrichi([]);
    try {
      const { data: utilisateur } = await supabase.auth.getUser();
      if (!utilisateur.user) {
        throw new Error("Votre session a expiré, reconnectez-vous.");
      }
      const produits: ModuleCours[] = [];
      for (let i = 0; i < modules.length; i += 1) {
        const mod = modules[i]!;
        setProgression(`Recherche théorique — module ${i + 1}/${modules.length} : ${mod.titre}`);
        const moduleCours = await genererCoursFn({
          data: {
            titreFormation: formation.titre,
            publicCible: formation.programme?.publicConcerne ?? "",
            module: { titre: mod.titre, points: mod.points ?? [] },
          },
        });
        produits.push(moduleCours);
        setCoursEnrichi([...produits]);

        const { error: erreurCours } = await supabase.from("supports_cours").upsert(
          {
            formateur_id: utilisateur.user.id,
            formation_id: formation.id,
            numero_module: i + 1,
            titre_module: moduleCours.title,
            contenu: JSON.parse(JSON.stringify(moduleCours)) as Json,
          },
          { onConflict: "formation_id,numero_module" },
        );
        if (erreurCours) throw new Error(erreurCours.message);
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La recherche théorique a échoué.");
    } finally {
      setProgression(null);
      setEnCours(null);
    }
  };

  const fichiersParModule = fichiers.reduce(
    (acc, f) => {
      const match = f.nom.match(/Module ([0-9]+)/);
      const mod = match ? "Module " + match[1] : "Général";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(f);
      return acc;
    },
    {} as Record<string, typeof fichiers>,
  );

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mes supports de formation</CardTitle>
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
                  <span className="text-sm text-muted-foreground">En cours : {progression}</span>
                )}
              </div>
            )}
            {enCours && (
              <p className="text-sm text-muted-foreground">
                La génération peut prendre plusieurs minutes. Vous retrouverez les supports dans le
                coffre-fort pédagogique correspondant.
              </p>
            )}
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          </CardContent>
        </Card>

        {formation && modules.length === 0 && (
          <p className="text-sm text-muted-foreground">Ce parcours ne contient aucun module.</p>
        )}

        {modules.map((mod, index) => (
          <Card key={`${mod.titre}-${index}`}>
            <CardHeader>
              <CardTitle className="text-base">
                Module {index + 1} — {mod.titre}
              </CardTitle>
              <CardDescription>{(mod.points ?? []).slice(0, 4).join(" • ")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              {(fichiersParModule[`Module ${index + 1}`] ?? []).length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-bold text-primary">Supports du module</p>
                  {(fichiersParModule[`Module ${index + 1}`] ?? []).map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border p-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{f.nom}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={chargementApercu === f.id}
                        onClick={() => void previsualiser(f)}
                      >
                        {chargementApercu === f.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="mr-2 h-4 w-4" />
                        )}
                        Aperçu
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void telecharger(f)}>
                        <Download className="mr-2 h-4 w-4" /> Télécharger
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {formation && (fichiersParModule["Général"] ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supports du parcours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(fichiersParModule["Général"] ?? []).map((f) => (
                <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                  <span className="min-w-0 flex-1 truncate text-sm">{f.nom}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={chargementApercu === f.id}
                    onClick={() => void previsualiser(f)}
                  >
                    {chargementApercu === f.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    Aperçu
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void telecharger(f)}>
                    <Download className="mr-2 h-4 w-4" /> Télécharger
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {formation && (
          <Card>
            <CardHeader>
              <CardTitle>Contenu interactif pour l'espace apprenant</CardTitle>
              <CardDescription>
                Mène une recherche théorique approfondie sur chaque module et enrichit le cours
                interactif consultable par les apprenants dans leur espace personnel. N'ajoute aucun
                fichier au coffre-fort.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                disabled={enCours !== null || modules.length === 0}
                onClick={genererContenuApprenant}
              >
                {enCours === "cours" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BookOpen className="mr-2 h-4 w-4" />
                )}
                Générer le contenu interactif
              </Button>
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
            </CardContent>
          </Card>
        )}
      </div>
      <VisionneuseFichier apercu={apercu} onFermer={() => setApercu(null)} />
    </>
  );
}
