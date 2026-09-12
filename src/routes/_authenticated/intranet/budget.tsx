import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { notifierDemandeBudget } from "@/lib/budget.functions";

export const Route = createFileRoute("/_authenticated/intranet/budget")({
  component: DemandeBudget,
});

interface Demande {
  id: string;
  apprenant_nom: string;
  apprenant_prenom: string;
  formation_souhaitee: string;
  statut: string;
  reponse: string;
  created_at: string;
}

const CHAMPS = [
  ["apprenant_prenom", "Prénom de l'apprenant"],
  ["apprenant_nom", "Nom de l'apprenant"],
  ["apprenant_email", "Email de l'apprenant"],
  ["apprenant_telephone", "Téléphone de l'apprenant"],
  ["entreprise_nom", "Entreprise"],
  ["entreprise_siret", "SIRET de l'entreprise"],
  ["entreprise_adresse", "Adresse de l'entreprise"],
  ["contact_nom", "Personne de contact dans l'entreprise"],
  ["contact_email", "Email de la personne de contact"],
  ["formation_souhaitee", "Formation souhaitée"],
  ["periode", "Période envisagée"],
] as const;

type CleChamp = (typeof CHAMPS)[number][0];

const VIDE: Record<CleChamp, string> = {
  apprenant_prenom: "",
  apprenant_nom: "",
  apprenant_email: "",
  apprenant_telephone: "",
  entreprise_nom: "",
  entreprise_siret: "",
  entreprise_adresse: "",
  contact_nom: "",
  contact_email: "",
  formation_souhaitee: "",
  periode: "",
};

function DemandeBudget() {
  const [form, setForm] = useState(VIDE);
  const [nombreHeures, setNombreHeures] = useState("");
  const [budget, setBudget] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [demandes, setDemandes] = useState<Demande[]>([]);

  const charger = async () => {
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) return;
    const { data } = await supabase
      .from("demandes_budget")
      .select(
        "id, apprenant_nom, apprenant_prenom, formation_souhaitee, statut, reponse, created_at",
      )
      .eq("formateur_id", utilisateur.user.id)
      .order("created_at", { ascending: false });
    setDemandes((data ?? []) as Demande[]);
  };

  useEffect(() => {
    void charger();
  }, []);

  const complet =
    form.apprenant_nom.trim() !== "" &&
    form.apprenant_prenom.trim() !== "" &&
    form.entreprise_nom.trim() !== "" &&
    form.formation_souhaitee.trim() !== "";

  const envoyer = async () => {
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) return;
    setEnvoi(true);
    setErreur(null);
    setMessage(null);
    const { error } = await supabase.from("demandes_budget").insert({
      formateur_id: utilisateur.user.id,
      ...form,
      nombre_heures: Number(nombreHeures) || 0,
      budget_estime: Number(budget) || 0,
      commentaire,
    });
    if (error) {
      setErreur("L'envoi a échoué : " + error.message);
    } else {
      setMessage(
        "Votre demande a été transmise à l'administration Formatrix. Vous recevrez une réponse dans cet onglet.",
      );
      setForm(VIDE);
      setNombreHeures("");
      setBudget("");
      setCommentaire("");
      await charger();
    }
    setEnvoi(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Demande de budget</CardTitle>
          <CardDescription>
            Renseignez les informations concernant l'apprenant et son entreprise.
            La demande est transmise à l'administration Formatrix pour
            traitement.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {CHAMPS.map(([cle, label]) => (
            <div key={cle} className="space-y-2">
              <Label htmlFor={cle} className="text-sm font-bold text-primary">
                {label}
              </Label>
              <Input
                id={cle}
                value={form[cle]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [cle]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="heures" className="text-sm font-bold text-primary">
              Nombre d'heures
            </Label>
            <Input
              id="heures"
              type="number"
              min="0"
              value={nombreHeures}
              onChange={(e) => setNombreHeures(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget" className="text-sm font-bold text-primary">
              Budget estimé (€)
            </Label>
            <Input
              id="budget"
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label
              htmlFor="commentaire"
              className="text-sm font-bold text-primary"
            >
              Commentaire
            </Label>
            <Textarea
              id="commentaire"
              rows={4}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            {erreur && (
              <p className="text-xs font-medium text-destructive">{erreur}</p>
            )}
            {message && (
              <p className="text-xs font-medium text-primary">{message}</p>
            )}
            <Button type="button" disabled={!complet || envoi} onClick={envoyer}>
              {envoi ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Envoyer la demande
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Mes demandes</CardTitle>
          <CardDescription>
            Suivez l'avancement et la réponse de l'administration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {demandes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune demande envoyée pour le moment.
            </p>
          )}
          {demandes.map((d) => (
            <div key={d.id} className="space-y-1 rounded-md border p-4 text-sm">
              <p className="font-bold text-primary">
                {d.apprenant_prenom} {d.apprenant_nom} — {d.formation_souhaitee}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(d.created_at).toLocaleDateString("fr-FR")} —{" "}
                {d.statut === "traitee"
                  ? "traitée"
                  : d.statut === "en_cours"
                    ? "en cours de traitement"
                    : "nouvelle"}
              </p>
              {d.reponse && (
                <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                  {d.reponse}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
