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
  type_demande: string;
  archivee: boolean;
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
  created_at: string;
}

const LIBELLES: Record<string, string> = {
  cv: "CV",
  diplome: "Diplôme",
  identite: "Carte d'identité",
  casier: "Extrait de casier judiciaire",
  autre: "Autre pièce",
};

const ONGLETS = [
  ["budget", "Demandes de budget"],
  ["formation", "Dossiers de formation"],
  ["candidatures", "Candidatures de formateurs"],
] as const;

type Onglet = (typeof ONGLETS)[number][0];

function Administration() {
  const [onglet, setOnglet] = useState<Onglet>("budget");
  const [autorise, setAutorise] = useState<boolean | null>(null);
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [pieces, setPieces] = useState<PieceAdmin[]>([]);
  const [demandes, setDemandes] = useState<DemandeAdmin[]>([]);
  const [reponses, setReponses] = useState<Record<string, string>>({});
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

    const { data: demandesData } = await supabase
      .from("demandes_budget")
      .select("*")
      .order("created_at", { ascending: false });
    const liste = (demandesData ?? []) as unknown as DemandeAdmin[];
    setDemandes(liste);
    setReponses(Object.fromEntries(liste.map((d) => [d.id, d.reponse ?? ""])));
    setChargement(false);
  };

  useEffect(() => {
    void charger();
  }, []);

  const repondre = async (
    demande: DemandeAdmin,
    statut: "en_cours" | "traitee",
  ) => {
    await supabase
      .from("demandes_budget")
      .update({
        reponse: reponses[demande.id] ?? "",
        statut,
        archivee: statut === "traitee",
        repondu_at: new Date().toISOString(),
      })
      .eq("id", demande.id);
    await charger();
  };

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

  const carteDemande = (demande: DemandeAdmin, archive: boolean) => (
    <div key={demande.id} className="space-y-3 rounded-md border p-4">
      <div>
        <p className="text-sm font-bold text-primary">
          {demande.apprenant_prenom} {demande.apprenant_nom} —{" "}
          {demande.formation_souhaitee}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(demande.created_at).toLocaleDateString("fr-FR")} —{" "}
          {demande.statut === "traitee"
            ? "validée"
            : demande.statut === "en_cours"
              ? "en cours"
              : "nouvelle"}
        </p>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <p>
          Apprenant : {demande.apprenant_email} {demande.apprenant_telephone}
        </p>
        <p>
          Entreprise : {demande.entreprise_nom} — SIRET{" "}
          {demande.entreprise_siret}
        </p>
        <p>Adresse : {demande.entreprise_adresse}</p>
        <p>
          Contact : {demande.contact_nom} {demande.contact_email}
        </p>
      </div>
      {archive ? (
        demande.reponse && (
          <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
            {demande.reponse}
          </p>
        )
      ) : (
        <>
          <Textarea
            rows={3}
            placeholder="Votre commentaire au formateur…"
            value={reponses[demande.id] ?? ""}
            onChange={(e) =>
              setReponses((r) => ({ ...r, [demande.id]: e.target.value }))
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void repondre(demande, "en_cours")}
            >
              Enregistrer (en cours)
            </Button>
            <Button size="sm" onClick={() => void repondre(demande, "traitee")}>
              <Check className="mr-2 h-4 w-4" />
              Valider et archiver
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const sectionDemandes = (type: "budget" | "formation") => {
    const duType = demandes.filter(
      (d) => (d.type_demande ?? "budget") === type,
    );
    const aTraiter = duType.filter((d) => !d.archivee);
    const archives = duType.filter((d) => d.archivee);
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">À traiter</CardTitle>
            <CardDescription>
              Apportez une réponse qualitative, puis validez pour archiver le
              dossier dans les deux espaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aTraiter.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun dossier en attente.
              </p>
            )}
            {aTraiter.map((d) => carteDemande(d, false))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Archives</CardTitle>
            <CardDescription>
              Dossiers validés, conservés avec leur réponse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {archives.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun dossier archivé.
              </p>
            )}
            {archives.map((d) => carteDemande(d, true))}
          </CardContent>
        </Card>
      </div>
    );
  };

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
        : sectionDemandes(onglet)}
    </div>
  );
}
