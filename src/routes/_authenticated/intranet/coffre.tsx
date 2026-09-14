import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Download, Eye, Link2, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { nomFichierSur } from "@/lib/storage";
import { DossiersApprenants } from "@/components/DossiersApprenants";
import { VisionneuseFichier, type ApercuFichier } from "@/components/VisionneuseFichier";
import { construireApercuScorm } from "@/lib/supports/scormPreview";

export const Route = createFileRoute("/_authenticated/intranet/coffre")({
  component: Coffre,
});

interface ModuleProgramme {
  titre: string;
  points: string[];
}

interface Formation {
  id: string;
  titre: string;
  programme: { modules?: ModuleProgramme[] } | null;
}

interface Fichier {
  id: string;
  nom: string;
  chemin: string;
  taille: number;
}

function formatTaille(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

interface Partage {
  id: string;
  jeton: string;
  actif: boolean;
}

interface Questionnaire {
  id: string;
  type: "positionnement" | "acquis";
  titre: string;
}

function jetonAleatoire() {
  const octets = new Uint8Array(24);
  crypto.getRandomValues(octets);
  return Array.from(octets)
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

function Coffre() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formationId, setFormationId] = useState("");
  const [fichiers, setFichiers] = useState<Fichier[]>([]);
  const [partage, setPartage] = useState<Partage | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [apercu, setApercu] = useState<ApercuFichier | null>(null);
  const [apercuUrlObjet, setApercuUrlObjet] = useState<string | null>(null);
  const [chargementApercu, setChargementApercu] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: utilisateur } = await supabase.auth.getUser();
      if (!utilisateur.user) return;
      const { data } = await supabase
        .from("formations")
        .select("id, titre, programme")
        .eq("formateur_id", utilisateur.user.id)
        .order("created_at", { ascending: false });
      setFormations((data ?? []) as unknown as Formation[]);
    })();
  }, []);

  const chargerFormation = async (id: string) => {
    const { data: fichiersData } = await supabase
      .from("coffre_fichiers")
      .select("id, nom, chemin, taille")
      .eq("formation_id", id)
      .order("created_at", { ascending: true });
    // Le coffre-fort ne doit contenir que des PDF : les éventuels PowerPoint
    // déposés avant cette règle restent en base mais ne sont plus affichés.
    const tous = (fichiersData ?? []) as unknown as Fichier[];
    setFichiers(tous.filter((f) => !/\.pptx?$/i.test(f.nom)));

    const { data: questionnairesData } = await supabase
      .from("questionnaires")
      .select("id, type, titre")
      .eq("formation_id", id)
      .order("created_at", { ascending: false });
    setQuestionnaires((questionnairesData ?? []) as Questionnaire[]);

    let { data: partageData } = await supabase
      .from("partages_coffre")
      .select("id, jeton, actif")
      .eq("formation_id", id)
      .eq("actif", true)
      .maybeSingle();

    // Le coffre-fort est immédiatement partageable dès qu'une formation est
    // choisie : le lien est créé automatiquement s'il n'existe pas encore.
    if (!partageData) {
      const { data: utilisateur } = await supabase.auth.getUser();
      if (utilisateur.user) {
        const { data: cree } = await supabase
          .from("partages_coffre")
          .insert({
            formateur_id: utilisateur.user.id,
            formation_id: id,
            jeton: jetonAleatoire(),
          })
          .select("id, jeton, actif")
          .maybeSingle();
        partageData = cree ?? null;
      }
    }
    setPartage((partageData ?? null) as Partage | null);
  };

  const choisirFormation = async (id: string) => {
    setFormationId(id);
    setErreur(null);
    setCopie(false);
    await chargerFormation(id);
  };

  const telecharger = async (fichier: Fichier) => {
    const { data, error } = await supabase.storage
      .from("coffre")
      .createSignedUrl(fichier.chemin, 300, { download: fichier.nom });
    if (error || !data) {
      setErreur("Impossible de télécharger ce fichier pour le moment.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const fermerApercu = () => {
    if (apercuUrlObjet) URL.revokeObjectURL(apercuUrlObjet);
    setApercuUrlObjet(null);
    setApercu(null);
  };

  /**
   * Visionneuse en incrustation : les PDF s'affichent directement via leur
   * URL signée (le navigateur les rend nativement) ; les paquets SCORM sont
   * dézippés puis reconstruits en une page HTML autonome avant affichage.
   */
  const previsualiser = async (fichier: Fichier) => {
    setErreur(null);
    setChargementApercu(fichier.id);
    try {
      const { data, error } = await supabase.storage
        .from("coffre")
        .createSignedUrl(fichier.chemin, 300);
      if (error || !data) throw new Error("Impossible d'ouvrir ce fichier pour le moment.");

      if (/\.zip$/i.test(fichier.nom)) {
        const reponse = await fetch(data.signedUrl);
        if (!reponse.ok) throw new Error("Le paquet n'a pas pu être téléchargé pour aperçu.");
        const html = await construireApercuScorm(await reponse.blob());
        const urlObjet = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        setApercuUrlObjet(urlObjet);
        setApercu({ titre: fichier.nom, url: urlObjet });
      } else {
        setApercu({ titre: fichier.nom, url: data.signedUrl });
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de prévisualiser ce fichier.");
    } finally {
      setChargementApercu(null);
    }
  };

  const deposer = async (fichier: File) => {
    if (!formationId) return;
    setEnvoi(true);
    setErreur(null);
    if (/\.pptx?$/i.test(fichier.name)) {
      setErreur(
        "Les fichiers PowerPoint ne sont pas acceptés dans le coffre-fort : déposez la version PDF finalisée.",
      );
      setEnvoi(false);
      return;
    }
    if (fichier.size > 50 * 1024 * 1024) {
      setErreur("Ce fichier dépasse 50 Mo : réduisez-le avant de le déposer.");
      setEnvoi(false);
      return;
    }
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) {
      setErreur("Votre session a expiré, reconnectez-vous puis réessayez.");
      setEnvoi(false);
      return;
    }
    const chemin = `${utilisateur.user.id}/${formationId}/${Date.now()}-${nomFichierSur(fichier.name)}`;
    const { error: erreurUpload } = await supabase.storage.from("coffre").upload(chemin, fichier);
    if (erreurUpload) {
      setErreur("Le dépôt a échoué : " + erreurUpload.message);
      setEnvoi(false);
      return;
    }
    const { error } = await supabase.from("coffre_fichiers").insert({
      formateur_id: utilisateur.user.id,
      formation_id: formationId,
      nom: fichier.name,
      chemin,
      taille: fichier.size,
    });
    if (error) setErreur("Le dépôt a échoué : " + error.message);
    await chargerFormation(formationId);
    setEnvoi(false);
  };

  const supprimer = async (fichier: Fichier) => {
    await supabase.storage.from("coffre").remove([fichier.chemin]);
    await supabase.from("coffre_fichiers").delete().eq("id", fichier.id);
    await chargerFormation(formationId);
  };

  const partagerAvecApprenants = async () => {
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user || !formationId) return;
    const { error } = await supabase.from("partages_coffre").insert({
      formateur_id: utilisateur.user.id,
      formation_id: formationId,
      jeton: jetonAleatoire(),
    });
    if (error) setErreur("Le partage a échoué : " + error.message);
    await chargerFormation(formationId);
  };

  const revoquer = async () => {
    if (!partage) return;
    await supabase.from("partages_coffre").update({ actif: false }).eq("id", partage.id);
    await chargerFormation(formationId);
  };

  const lien = partage
    ? `${typeof window === "undefined" ? "" : window.location.origin}/partage/${partage.jeton}`
    : "";

  const formation = formations.find((f) => f.id === formationId) ?? null;
  const modules = formation?.programme?.modules ?? [];

  const fichiersParModule = fichiers.reduce(
    (acc, f) => {
      const match = f.nom.match(/Module ([0-9]+)/);
      const cle = match ? match[1]! : "general";
      if (!acc[cle]) acc[cle] = [];
      acc[cle].push(f);
      return acc;
    },
    {} as Record<string, Fichier[]>,
  );
  const fichiersGeneraux = fichiersParModule["general"] ?? [];

  const ligneFichier = (fichier: Fichier) => (
    <div
      key={fichier.id}
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fichier.nom}</p>
        <p className="text-xs text-muted-foreground">{formatTaille(fichier.taille)}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Aperçu de ${fichier.nom}`}
          disabled={chargementApercu === fichier.id}
          onClick={() => void previsualiser(fichier)}
        >
          {chargementApercu === fichier.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Télécharger ${fichier.nom}`}
          onClick={() => void telecharger(fichier)}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Supprimer ${fichier.nom}`}
          onClick={() => void supprimer(fichier)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Coffre-fort pédagogique</CardTitle>
          <CardDescription>
            Choisissez une formation pour consulter ses documents, classés par module. Seuls les PDF
            y sont archivés ; ils restent privés tant que vous ne créez pas de lien de partage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-primary">Formation</Label>
            <Select value={formationId} onValueChange={choisirFormation}>
              <SelectTrigger className="sm:w-96">
                <SelectValue placeholder="Choisir une formation" />
              </SelectTrigger>
              <SelectContent>
                {formations.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formations.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Enregistrez d'abord une formation dans l'onglet « Mes Formations ».
              </p>
            )}
          </div>
          {erreur && <p className="text-xs font-medium text-destructive">{erreur}</p>}
        </CardContent>
      </Card>

      {formation && (
        <>
          <div>
            <h2 className="text-2xl font-bold text-primary">{formation.titre}</h2>
            <p className="text-sm text-muted-foreground">
              Coffre-fort pédagogique — documents classés par module
            </p>
          </div>

          {modules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ce parcours ne contient aucun module ; les documents déposés apparaissent dans la
              section « Documents généraux » ci-dessous.
            </p>
          )}

          {modules.map((mod, index) => {
            const liste = fichiersParModule[String(index + 1)] ?? [];
            return (
              <Card key={`${mod.titre}-${index}`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Module {index + 1} — {mod.titre}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {liste.length > 0 ? (
                    liste.map(ligneFichier)
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun support déposé pour ce module.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents généraux</CardTitle>
              <CardDescription>
                Paquet SCORM, pièces déposées manuellement et documents rattachés automatiquement au
                parcours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  className="max-w-xs"
                  aria-label="Déposer un fichier"
                  onChange={(e) => {
                    const fichier = e.target.files?.[0];
                    if (fichier) void deposer(fichier);
                    e.target.value = "";
                  }}
                />
                {envoi ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-2">
                {fichiersGeneraux.length > 0 ? (
                  fichiersGeneraux.map(ligneFichier)
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun document général déposé pour cette formation.
                  </p>
                )}
              </div>

              <div className="rounded-md border p-4">
                <p className="text-sm font-bold text-primary">
                  Documents rattachés automatiquement
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>Recueil des besoins pré-formation</li>
                  {(["positionnement", "acquis"] as const).map((type) => {
                    const q = questionnaires.find((item) => item.type === type);
                    const libelle =
                      type === "positionnement"
                        ? "Test de positionnement"
                        : "Évaluation des acquis";
                    return (
                      <li key={type}>
                        {libelle} :{" "}
                        {q ? (
                          <span className="font-medium text-primary">{q.titre}</span>
                        ) : (
                          "à générer dans l'onglet dédié"
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {formationId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Partage avec les apprenants</CardTitle>
            <CardDescription>
              Un lien de consultation en lecture seule, sans création de compte, limité aux fichiers
              de cette formation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {partage ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={lien} readOnly className="sm:w-96" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(lien);
                      setCopie(true);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copie ? "Lien copié" : "Copier le lien"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={revoquer}>
                    Révoquer
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={partagerAvecApprenants}>
                <Link2 className="mr-2 h-4 w-4" />
                Partager avec les apprenants
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {formationId && <DossiersApprenants formationId={formationId} />}

      <VisionneuseFichier apercu={apercu} onFermer={fermerApercu} />
    </div>
  );
}
