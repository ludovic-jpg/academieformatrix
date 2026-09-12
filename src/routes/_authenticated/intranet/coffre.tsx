import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Link2, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/intranet/coffre")({
  component: Coffre,
});

interface Formation {
  id: string;
  titre: string;
}

interface Fichier {
  id: string;
  nom: string;
  chemin: string;
  taille: number;
}

interface Partage {
  id: string;
  jeton: string;
  actif: boolean;
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
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: utilisateur } = await supabase.auth.getUser();
      if (!utilisateur.user) return;
      const { data } = await supabase
        .from("formations")
        .select("id, titre")
        .eq("formateur_id", utilisateur.user.id)
        .order("created_at", { ascending: false });
      setFormations((data ?? []) as Formation[]);
    })();
  }, []);

  const chargerFormation = async (id: string) => {
    const { data: fichiersData } = await supabase
      .from("coffre_fichiers")
      .select("id, nom, chemin, taille")
      .eq("formation_id", id)
      .order("created_at", { ascending: true });
    setFichiers((fichiersData ?? []) as unknown as Fichier[]);

    const { data: partageData } = await supabase
      .from("partages_coffre")
      .select("id, jeton, actif")
      .eq("formation_id", id)
      .eq("actif", true)
      .maybeSingle();
    setPartage((partageData ?? null) as Partage | null);
  };

  const choisirFormation = async (id: string) => {
    setFormationId(id);
    setErreur(null);
    setCopie(false);
    await chargerFormation(id);
  };

  const deposer = async (fichier: File) => {
    if (!formationId) return;
    setEnvoi(true);
    setErreur(null);
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) return;
    const chemin = `${utilisateur.user.id}/${formationId}/${Date.now()}-${fichier.name}`;
    const { error: erreurUpload } = await supabase.storage
      .from("coffre")
      .upload(chemin, fichier);
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
    await supabase
      .from("partages_coffre")
      .update({ actif: false })
      .eq("id", partage.id);
    await chargerFormation(formationId);
  };

  const lien = partage
    ? `${typeof window === "undefined" ? "" : window.location.origin}/partage/${partage.jeton}`
    : "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Coffre-fort pédagogique</CardTitle>
          <CardDescription>
            Déposez vos supports par formation. Ils restent privés tant que vous
            ne créez pas de lien de partage.
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
                Enregistrez d'abord une formation dans l'onglet « Mes
                Formations ».
              </p>
            )}
          </div>

          {formationId && (
            <>
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

              <ul className="space-y-2">
                {fichiers.map((fichier) => (
                  <li
                    key={fichier.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <span className="truncate">{fichier.nom}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Supprimer ${fichier.nom}`}
                      onClick={() => void supprimer(fichier)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
                {fichiers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun fichier déposé pour cette formation.
                  </p>
                )}
              </ul>
            </>
          )}

          {erreur && (
            <p className="text-xs font-medium text-destructive">{erreur}</p>
          )}
        </CardContent>
      </Card>

      {formationId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">
              Partage avec les apprenants
            </CardTitle>
            <CardDescription>
              Un lien de consultation en lecture seule, sans création de compte,
              limité aux fichiers de cette formation.
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
    </div>
  );
}
