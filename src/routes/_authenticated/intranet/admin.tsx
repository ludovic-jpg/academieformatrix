import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/intranet/admin")({
  component: Administration,
});

interface Candidature {
  user_id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  adresse: string;
  numero_declaration_activite: string;
  siret: string;
  statut: string;
  consentement: boolean;
  created_at: string;
}

interface DemandeAdmin {
  id: string;
  apprenant_nom: string;
  apprenant_prenom: string;
  apprenant_email: string;
  apprenant_telephone: string;
  entreprise_nom: string;
  entreprise_siret: string;
  entreprise_adresse: string;
  contact_nom: string;
  contact_email: string;
  formation_souhaitee: string;
  periode: string;
  nombre_heures: number;
  budget_estime: number;
  commentaire: string;
  statut: string;
  reponse: string;
  created_at: string;
}

interface PieceAdmin {
  id: string;
  formateur_id: string;
  type: string;
  nom_fichier: string;
  chemin: string;
}

const LIBELLES: Record<string, string> = {
  cv: "CV",
  diplome: "Diplôme",
  identite: "Carte d'identité",
  casier: "Extrait de casier judiciaire",
  autre: "Autre pièce",
};

function Administration() {
  const [autorise, setAutorise] = useState<boolean | null>(null);
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [pieces, setPieces] = useState<PieceAdmin[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = async () => {
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) return;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", utilisateur.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      setAutorise(false);
      setChargement(false);
      return;
    }
    setAutorise(true);

    const { data: profils } = await supabase
      .from("profils_formateurs")
      .select("*")
      .order("created_at", { ascending: false });
    setCandidatures((profils ?? []) as unknown as Candidature[]);

    const { data: piecesData } = await supabase
      .from("pieces_formateur")
      .select("id, formateur_id, type, nom_fichier, chemin");
    setPieces((piecesData ?? []) as unknown as PieceAdmin[]);
    setChargement(false);
  };

  useEffect(() => {
    void charger();
  }, []);

  const changerStatut = async (userId: string, statut: string) => {
    await supabase
      .from("profils_formateurs")
      .update({ statut: statut as "validee" | "refusee" | "en_attente" })
      .eq("user_id", userId);
    await charger();
  };

  const ouvrirPiece = async (piece: PieceAdmin) => {
    const { data } = await supabase.storage
      .from("pieces")
      .createSignedUrl(piece.chemin, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noreferrer");
  };

  if (chargement) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </p>
    );
  }

  if (autorise === false) {
    return (
      <p className="text-sm text-muted-foreground">
        Cet espace est réservé à l'administration Formatrix.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">
            Candidatures des formateurs
          </CardTitle>
          <CardDescription>
            Consultez les dossiers, ouvrez les pièces et validez les
            candidatures.
          </CardDescription>
        </CardHeader>
      </Card>

      {candidatures.map((candidature) => {
        const piecesFormateur = pieces.filter(
          (p) => p.formateur_id === candidature.user_id,
        );
        return (
          <Card key={candidature.user_id}>
            <CardHeader>
              <CardTitle className="text-primary">
                {candidature.prenom} {candidature.nom || candidature.email}
              </CardTitle>
              <CardDescription>
                {candidature.email} — {candidature.telephone} —{" "}
                {candidature.statut === "validee"
                  ? "candidature validée"
                  : candidature.statut === "refusee"
                    ? "candidature refusée"
                    : "en attente de validation"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {candidature.adresse}
                {candidature.siret ? ` — SIRET ${candidature.siret}` : ""}
                {candidature.numero_declaration_activite
                  ? ` — NDA ${candidature.numero_declaration_activite}`
                  : ""}
              </p>
              <div className="space-y-1">
                {piecesFormateur.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucune pièce déposée.
                  </p>
                )}
                {piecesFormateur.map((piece) => (
                  <button
                    key={piece.id}
                    type="button"
                    className="block text-xs text-primary underline"
                    onClick={() => void ouvrirPiece(piece)}
                  >
                    {LIBELLES[piece.type] ?? piece.type} — {piece.nom_fichier}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => changerStatut(candidature.user_id, "validee")}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Valider
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changerStatut(candidature.user_id, "refusee")}
                >
                  <X className="mr-2 h-4 w-4" />
                  Refuser
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
