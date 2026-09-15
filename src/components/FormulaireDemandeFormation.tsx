import { useEffect, useState } from "react";
import { Loader2, Save, Send } from "lucide-react";

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
import { notifierDemandeFormation } from "@/lib/formation-demande.functions";

export const CHAMPS_DEMANDE = [
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
] as const;

type CleChamp = (typeof CHAMPS_DEMANDE)[number][0];

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
};

const CHAMPS_APPRENANT = CHAMPS_DEMANDE.filter(
  ([cle]) => cle !== "formation_souhaitee",
).map(([cle]) => cle);

export interface DemandeListee {
  id: string;
  apprenant_nom: string;
  apprenant_prenom: string;
  formation_souhaitee: string;
  statut: string;
  reponse: string;
  archivee: boolean;
  created_at: string;
}

interface Apprenant extends Record<string, unknown> {
  id: string;
  apprenant_nom: string;
  apprenant_prenom: string;
}

export function libelleStatut(statut: string) {
  return statut === "traitee"
    ? "traitée"
    : statut === "en_cours"
      ? "en cours de traitement"
      : "nouvelle";
}

export function FormulaireDemandeFormation() {
  const [onglet, setOnglet] = useState<"nouvelle" | "archives">("nouvelle");
  const [form, setForm] = useState(VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [sauvegardeFiche, setSauvegardeFiche] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [demandes, setDemandes] = useState<DemandeListee[]>([]);
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);

  const charger = async () => {
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) return;
    const { data } = await supabase
      .from("demandes_formation")
      .select(
        "id, apprenant_nom, apprenant_prenom, formation_souhaitee, statut, reponse, archivee, created_at",
      )
      .eq("formateur_id", utilisateur.user.id)
      .order("created_at", { ascending: false });
    setDemandes((data ?? []) as unknown as DemandeListee[]);

    const { data: fiches } = await supabase
      .from("apprenants")
      .select("*")
      .eq("formateur_id", utilisateur.user.id)
      .order("created_at", { ascending: false });
    setApprenants((fiches ?? []) as unknown as Apprenant[]);
  };

  useEffect(() => {
    void charger();
  }, []);

  const reutiliserFiche = (id: string) => {
    const fiche = apprenants.find((a) => a.id === id);
    if (!fiche) return;
    setForm((f) => {
      const suivant = { ...f };
      for (const cle of CHAMPS_APPRENANT) {
        suivant[cle] = (fiche[cle] as string) ?? "";
      }
      return suivant;
    });
  };

  const enregistrerFiche = async () => {
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) return;
    setSauvegardeFiche(true);
    setErreur(null);
    setMessage(null);
    const valeurs = Object.fromEntries(
      CHAMPS_APPRENANT.map((cle) => [cle, form[cle]]),
    );
    const { error } = await supabase
      .from("apprenants")
      .insert({ formateur_id: utilisateur.user.id, ...valeurs });
    if (error) setErreur("La fiche n'a pas pu être enregistrée.");
    else {
      setMessage("Fiche apprenant enregistrée, réutilisable dans les autres formulaires.");
      await charger();
    }
    setSauvegardeFiche(false);
  };

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
    const { data: creee, error } = await supabase
      .from("demandes_formation")
      .insert({
        formateur_id: utilisateur.user.id,
        ...form,
      })
      .select("id")
      .single();
    if (error) {
      setErreur("L'envoi a échoué : " + error.message);
    } else {
      try {
        if (creee?.id) {
          await notifierDemandeFormation({ data: { demandeId: creee.id } });
        }
      } catch (e) {
        console.error("Notification non envoyée", e);
      }
      setMessage(
        "Votre demande a été transmise à l'administration Formatrix. La réponse apparaîtra ici.",
      );
      setForm(VIDE);
      await charger();
    }
    setEnvoi(false);
  };

  const enCours = demandes.filter((d) => !d.archivee);
  const archives = demandes.filter((d) => d.archivee);

  const ligne = (d: DemandeListee) => (
    <div key={d.id} className="space-y-1 rounded-md border p-4 text-sm">
      <p className="font-bold text-primary">
        {d.apprenant_prenom} {d.apprenant_nom} — {d.formation_souhaitee}
      </p>
      <p className="text-xs text-muted-foreground">
        {new Date(d.created_at).toLocaleDateString("fr-FR")} —{" "}
        {libelleStatut(d.statut)}
      </p>
      {d.reponse && (
        <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
          {d.reponse}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["nouvelle", "Nouvelle demande"],
            ["archives", "Archives"],
          ] as const
        ).map(([cle, label]) => (
          <Button
            key={cle}
            type="button"
            variant={onglet === cle ? "default" : "outline"}
            size="sm"
            onClick={() => setOnglet(cle)}
          >
            {label}
          </Button>
        ))}
      </div>

      {onglet === "nouvelle" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Demande de formation</CardTitle>
              <CardDescription>
                Constituez le dossier de formation d'un apprenant. Il est
                transmis à l'administration Formatrix, puis archivé une fois
                validé.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {apprenants.length > 0 && (
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-bold text-primary">
                    Réutiliser une fiche apprenant
                  </Label>
                  <Select onValueChange={reutiliserFiche}>
                    <SelectTrigger className="sm:w-96">
                      <SelectValue placeholder="Choisir une fiche enregistrée" />
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
              )}
              {CHAMPS_DEMANDE.map(([cle, label]) => (
                <div key={cle} className="space-y-2">
                  <Label
                    htmlFor={`formation-${cle}`}
                    className="text-sm font-bold text-primary"
                  >
                    {label}
                  </Label>
                  <Input
                    id={`formation-${cle}`}
                    value={form[cle]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [cle]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                {erreur && (
                  <p className="text-xs font-medium text-destructive">
                    {erreur}
                  </p>
                )}
                {message && (
                  <p className="text-xs font-medium text-primary">{message}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={!complet || envoi}
                    onClick={envoyer}
                  >
                    {envoi ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Envoyer la demande
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      sauvegardeFiche ||
                      form.apprenant_nom.trim() === "" ||
                      form.apprenant_prenom.trim() === ""
                    }
                    onClick={enregistrerFiche}
                  >
                    {sauvegardeFiche ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Enregistrer la fiche apprenant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Demandes en cours</CardTitle>
              <CardDescription>
                Elles rejoindront les archives dès que l'administration les aura
                validées.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {enCours.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune demande en cours.
                </p>
              )}
              {enCours.map(ligne)}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Archives</CardTitle>
            <CardDescription>
              Dossiers validés par l'administration, avec l'ensemble des
              éléments de réponse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {archives.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun dossier archivé pour le moment.
              </p>
            )}
            {archives.map(ligne)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
