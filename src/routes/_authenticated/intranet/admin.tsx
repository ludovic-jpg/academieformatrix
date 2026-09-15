import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Eye, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface PieceAdmin {
  id: string;
  formateur_id: string;
  type: string;
  nom_fichier: string;
  chemin: string;
  created_at: string;
}

interface EvaluationAdmin {
  id: string;
  score: number;
  total: number;
  soumis_at: string;
  dossiers_apprenant: {
    apprenants: { apprenant_prenom: string; apprenant_nom: string } | null;
    formations: { titre: string } | null;
  } | null;
  questionnaires: { type: string; titre: string } | null;
}

const LIBELLES: Record<string, string> = {
  cv: "CV",
  diplome: "Diplôme",
  identite: "Carte d'identité",
  casier: "Extrait de casier judiciaire",
  autre: "Autre pièce",
};

const ONGLETS = [
  ["candidatures", "Candidatures de formateurs"],
  ["evaluations", "Évaluations apprenants"],
] as const;

type Onglet = (typeof ONGLETS)[number][0];

function Administration() {
  const [onglet, setOnglet] = useState<Onglet>("candidatures");
  const [autorise, setAutorise] = useState<boolean | null>(null);
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [pieces, setPieces] = useState<PieceAdmin[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationAdmin[]>([]);
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
      .select("id, formateur_id, type, nom_fichier, chemin, created_at")
      .order("created_at", { ascending: false });
    setPieces((piecesData ?? []) as unknown as PieceAdmin[]);

    const { data: evaluationsData } = await supabase
      .from("reponses_questionnaires")
      .select("id, score, total, soumis_at, dossiers_apprenant(apprenants(apprenant_prenom, apprenant_nom), formations(titre)), questionnaires(type, titre)")
      .order("soumis_at", { ascending: false });
    setEvaluations((evaluationsData ?? []) as unknown as EvaluationAdmin[]);
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

  const sectionCandidatures = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">
            Candidatures et pièces justificatives
          </CardTitle>
          <CardDescription>
            Consultez l'ensemble des pièces déposées par chaque formateur pour
            les présenter lors de l'audit Qualiopi.
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
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                {candidature.adresse}
                {candidature.siret ? ` — SIRET ${candidature.siret}` : ""}
                {candidature.numero_declaration_activite
                  ? ` — NDA ${candidature.numero_declaration_activite}`
                  : ""}
              </p>
              <div className="space-y-2">
                {piecesFormateur.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucune pièce déposée.
                  </p>
                )}
                {Object.keys(LIBELLES).map((type) => {
                  const duType = piecesFormateur.filter((p) => p.type === type);
                  if (duType.length === 0) return null;
                  return (
                    <div key={type} className="rounded-md border p-3">
                      <p className="text-xs font-bold text-primary">
                        {LIBELLES[type]}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {duType.map((piece) => (
                          <li
                            key={piece.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
                          >
                            <span className="truncate">
                              {piece.nom_fichier} —{" "}
                              {new Date(piece.created_at).toLocaleDateString(
                                "fr-FR",
                              )}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void ouvrirPiece(piece)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Consulter
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
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

  const sectionEvaluations = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Évaluations apprenants</CardTitle>
        <CardDescription>Résultats transmis depuis les espaces de formation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {evaluations.map((evaluation) => {
          const apprenant = evaluation.dossiers_apprenant?.apprenants;
          return (
            <div key={evaluation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
              <div>
                <p className="text-sm font-bold text-primary">
                  {apprenant?.apprenant_prenom} {apprenant?.apprenant_nom}
                </p>
                <p className="text-xs text-muted-foreground">
                  {evaluation.dossiers_apprenant?.formations?.titre} — {evaluation.questionnaires?.titre}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{evaluation.score}/{evaluation.total}</p>
                <p className="text-xs text-muted-foreground">{Math.round((evaluation.score / Math.max(1, evaluation.total)) * 100)} %</p>
              </div>
            </div>
          );
        })}
        {evaluations.length === 0 && <p className="text-sm text-muted-foreground">Aucune évaluation transmise.</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 rounded-md bg-muted p-2">
        {ONGLETS.map(([cle, label]) => (
          <Button
            key={cle}
            type="button"
            size="sm"
            variant={onglet === cle ? "default" : "ghost"}
            onClick={() => setOnglet(cle)}
          >
            {label}
          </Button>
        ))}
      </div>

      {onglet === "candidatures"
        ? sectionCandidatures()
        : sectionEvaluations()}
    </div>
  );
}
