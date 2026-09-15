import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, Mail, Plus, Save, UserPlus } from "lucide-react";

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
import { WORKFLOWS } from "@/config/workflows";
import { supabase } from "@/integrations/supabase/client";
import { envoyerWorkflow } from "@/lib/workflow.functions";

interface Apprenant {
  id: string;
  apprenant_prenom: string;
  apprenant_nom: string;
  apprenant_email: string;
}

interface Dossier {
  id: string;
  jeton: string;
  etape: string;
  apprenant: Apprenant | null;
  completude: number;
  resultats: { type: string; score: number; total: number }[];
}

const DOCUMENTS_ATTENDUS = ["recueil", "positionnement", "acquis"] as const;

const NOUVEL_APPRENANT_VIDE = {
  apprenant_prenom: "",
  apprenant_nom: "",
  apprenant_email: "",
  apprenant_telephone: "",
};

function jetonAleatoire() {
  const octets = new Uint8Array(24);
  crypto.getRandomValues(octets);
  return Array.from(octets)
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

export function DossiersApprenants({ formationId }: { formationId: string }) {
  const envoyer = useServerFn(envoyerWorkflow);
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [apprenantId, setApprenantId] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [nouvelApprenant, setNouvelApprenant] = useState(NOUVEL_APPRENANT_VIDE);
  const [creationOccupee, setCreationOccupee] = useState(false);

  const charger = useCallback(async () => {
    const { data: utilisateur } = await supabase.auth.getUser();
    const user = utilisateur.user;
    if (!user) return;

    const { data: listeApprenants } = await supabase
      .from("apprenants")
      .select("id, apprenant_prenom, apprenant_nom, apprenant_email")
      .eq("formateur_id", user.id)
      .order("created_at", { ascending: false });
    setApprenants((listeApprenants ?? []) as Apprenant[]);

    const { data: listeDossiers } = await supabase
      .from("dossiers_apprenant")
      .select("id, jeton, etape, apprenant_id")
      .eq("formation_id", formationId)
      .order("created_at", { ascending: false });

    const resultats: Dossier[] = [];
    for (const dossier of listeDossiers ?? []) {
      const { data: documents } = await supabase
        .from("documents_dossier")
        .select("type")
        .eq("dossier_id", dossier.id);
      const { data: recueil } = await supabase
        .from("reponses_recueil")
        .select("soumis_at")
        .eq("dossier_id", dossier.id)
        .maybeSingle();
      const { data: evaluations } = await supabase
        .from("reponses_questionnaires")
        .select("score, total, questionnaires(type)")
        .eq("dossier_id", dossier.id);
      const types = new Set((documents ?? []).map((d) => d.type));
      if (recueil?.soumis_at) types.add("recueil");
      for (const evaluation of evaluations ?? []) {
        const questionnaire = evaluation.questionnaires as unknown as { type?: string } | null;
        if (questionnaire?.type) types.add(questionnaire.type);
      }
      const faits = DOCUMENTS_ATTENDUS.filter((t) => types.has(t)).length;
      resultats.push({
        id: dossier.id,
        jeton: dossier.jeton,
        etape: dossier.etape,
        apprenant:
          (listeApprenants ?? []).find((a) => a.id === dossier.apprenant_id) ??
          null,
        completude: Math.round((faits / DOCUMENTS_ATTENDUS.length) * 100),
        resultats: (evaluations ?? []).map((evaluation) => ({
          type: ((evaluation.questionnaires as unknown as { type?: string } | null)?.type ?? "evaluation"),
          score: Number(evaluation.score),
          total: Number(evaluation.total),
        })),
      });
    }
    setDossiers(resultats);
  }, [formationId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const creerDossier = async () => {
    if (!apprenantId) return;
    setOccupe(true);
    setErreur(null);
    setMessage(null);
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) {
      setErreur("Votre session a expiré, reconnectez-vous puis réessayez.");
      setOccupe(false);
      return;
    }
    const { error } = await supabase.from("dossiers_apprenant").insert({
      formateur_id: utilisateur.user.id,
      apprenant_id: apprenantId,
      formation_id: formationId,
      jeton: jetonAleatoire(),
    });
    if (error) {
      setErreur(
        error.code === "23505"
          ? "Cet apprenant a déjà un espace pour cette formation."
          : "La création de l'espace a échoué : " + error.message,
      );
    }
    await charger();
    setOccupe(false);
  };

  const creerApprenant = async () => {
    if (
      !nouvelApprenant.apprenant_prenom.trim() ||
      !nouvelApprenant.apprenant_nom.trim() ||
      !nouvelApprenant.apprenant_email.trim()
    ) {
      return;
    }
    setCreationOccupee(true);
    setErreur(null);
    setMessage(null);
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) {
      setErreur("Votre session a expiré, reconnectez-vous puis réessayez.");
      setCreationOccupee(false);
      return;
    }
    const { data: creee, error } = await supabase
      .from("apprenants")
      .insert({ formateur_id: utilisateur.user.id, ...nouvelApprenant })
      .select("id")
      .single();
    if (error) {
      setErreur("La fiche apprenant n'a pas pu être créée : " + error.message);
    } else {
      setMessage("Fiche apprenant créée. Vous pouvez l'associer au coffre-fort ci-dessous.");
      setNouvelApprenant(NOUVEL_APPRENANT_VIDE);
      setFormulaireOuvert(false);
      if (creee?.id) setApprenantId(creee.id);
    }
    await charger();
    setCreationOccupee(false);
  };

  const lancerWorkflow = async (dossier: Dossier, etape: string) => {
    setOccupe(true);
    setErreur(null);
    setMessage(null);
    try {
      const resultat = await envoyer({
        data: {
          dossierId: dossier.id,
          etape: etape as "positionnement",
          origine: window.location.origin,
        },
      });
      setMessage(
        resultat.envoye
          ? "L'email a été envoyé à l'apprenant."
          : "L'apprenant s'est désinscrit des emails : prévenez-le autrement.",
      );
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "L'envoi de l'email a échoué.",
      );
    }
    await charger();
    setOccupe(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Espaces apprenants</CardTitle>
        <CardDescription>
          Chaque apprenant associé dispose d'un espace personnel : coffre-fort,
          recueil des besoins, test de positionnement et évaluation des acquis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-primary">Apprenant</Label>
            <Select value={apprenantId} onValueChange={setApprenantId}>
              <SelectTrigger className="sm:w-80">
                <SelectValue placeholder="Choisir un apprenant enregistré" />
              </SelectTrigger>
              <SelectContent>
                {apprenants.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.apprenant_prenom} {a.apprenant_nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={creerDossier} disabled={!apprenantId || occupe}>
            {occupe ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Associer au coffre-fort
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormulaireOuvert((v) => !v)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvel apprenant
          </Button>
        </div>
        {apprenants.length === 0 && !formulaireOuvert && (
          <p className="text-xs text-muted-foreground">
            Aucune fiche apprenant disponible pour le moment. Créez-en une avec
            « Nouvel apprenant ».
          </p>
        )}

        {formulaireOuvert && (
          <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nouvel-apprenant-prenom" className="text-sm font-bold text-primary">
                Prénom
              </Label>
              <Input
                id="nouvel-apprenant-prenom"
                value={nouvelApprenant.apprenant_prenom}
                onChange={(e) =>
                  setNouvelApprenant((f) => ({ ...f, apprenant_prenom: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nouvel-apprenant-nom" className="text-sm font-bold text-primary">
                Nom
              </Label>
              <Input
                id="nouvel-apprenant-nom"
                value={nouvelApprenant.apprenant_nom}
                onChange={(e) =>
                  setNouvelApprenant((f) => ({ ...f, apprenant_nom: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nouvel-apprenant-email" className="text-sm font-bold text-primary">
                Email
              </Label>
              <Input
                id="nouvel-apprenant-email"
                type="email"
                value={nouvelApprenant.apprenant_email}
                onChange={(e) =>
                  setNouvelApprenant((f) => ({ ...f, apprenant_email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nouvel-apprenant-telephone" className="text-sm font-bold text-primary">
                Téléphone
              </Label>
              <Input
                id="nouvel-apprenant-telephone"
                value={nouvelApprenant.apprenant_telephone}
                onChange={(e) =>
                  setNouvelApprenant((f) => ({ ...f, apprenant_telephone: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                disabled={
                  creationOccupee ||
                  !nouvelApprenant.apprenant_prenom.trim() ||
                  !nouvelApprenant.apprenant_nom.trim() ||
                  !nouvelApprenant.apprenant_email.trim()
                }
                onClick={creerApprenant}
              >
                {creationOccupee ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Créer la fiche apprenant
              </Button>
            </div>
          </div>
        )}

        <ul className="space-y-3">
          {dossiers.map((dossier) => {
            const lien = `${typeof window === "undefined" ? "" : window.location.origin}/dossier/${dossier.jeton}`;
            return (
              <li key={dossier.id} className="space-y-3 rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-primary">
                    {dossier.apprenant?.apprenant_prenom}{" "}
                    {dossier.apprenant?.apprenant_nom}
                  </p>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    Dossier complété à {dossier.completude} %
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${dossier.completude}%` }}
                  />
                </div>
                {dossier.resultats.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dossier.resultats.map((resultat) => (
                      <span key={resultat.type} className="rounded-full border px-3 py-1 text-xs font-medium">
                        {resultat.type === "acquis" ? "Évaluation des acquis" : "Positionnement"} : {resultat.score}/{resultat.total}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={lien} readOnly className="sm:w-80" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void navigator.clipboard.writeText(lien)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copier le lien
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {WORKFLOWS.map((workflow) => (
                    <Button
                      key={workflow.cle}
                      variant={
                        dossier.etape === workflow.cle ? "default" : "outline"
                      }
                      size="sm"
                      disabled={occupe}
                      onClick={() => void lancerWorkflow(dossier, workflow.cle)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {workflow.titre}
                    </Button>
                  ))}
                </div>
              </li>
            );
          })}
          {dossiers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun apprenant associé à cette formation.
            </p>
          )}
        </ul>

        {erreur && (
          <p className="text-xs font-medium text-destructive">{erreur}</p>
        )}
        {message && <p className="text-xs font-medium text-primary">{message}</p>}
      </CardContent>
    </Card>
  );
}
