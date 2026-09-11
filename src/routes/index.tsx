import { createFileRoute } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, FileText, Plus, Sparkles, Trash2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  MODES_FORMATION,
  NIVEAUX,
  PHRASE_METHODES_PEDAGOGIQUES,
  type ModeFormation,
  type Niveau,
} from "@/config/programme";
import {
  programmeSchema,
  VALEURS_FORMULAIRE_DEFAUT,
  versProgrammeFormation,
  type ProgrammeFormValues,
} from "@/lib/programme-schema";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Formatrix — Créer un programme de formation" },
      {
        name: "description",
        content:
          "Formulaire de création d'un programme de formation détaillé : informations générales, public, organisation pédagogique, génération IA et export PDF / Word.",
      },
      {
        property: "og:title",
        content: "Formatrix — Créer un programme de formation",
      },
      {
        property: "og:description",
        content:
          "Saisissez les informations de votre formation, générez le programme détaillé et exportez-le en PDF ou Word.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Champ({
  id,
  label,
  children,
  hint,
  erreur,
  obligatoire,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
  erreur?: string;
  obligatoire?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-bold text-primary">
        {label}
        {obligatoire ? (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {erreur ? (
        <p className="text-xs font-medium text-destructive">{erreur}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ListeEditable({
  label,
  valeurs,
  onChange,
  placeholder,
}: {
  label: string;
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  placeholder?: string;
}) {
  const maj = (index: number, valeur: string) =>
    onChange(valeurs.map((v, i) => (i === index ? valeur : v)));
  const supprimer = (index: number) =>
    onChange(valeurs.filter((_, i) => i !== index));
  const ajouter = () => onChange([...valeurs, ""]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-primary">{label}</Label>
      <div className="space-y-2">
        {valeurs.map((valeur, index) => (
          <div key={index} className="flex items-start gap-2">
            <Textarea
              value={valeur}
              onChange={(e) => maj(index, e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => supprimer(index)}
              aria-label={`Supprimer la ligne ${index + 1}`}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={ajouter}
        className="border-dashed"
      >
        <Plus className="mr-2 h-4 w-4" />
        Ajouter une ligne
      </Button>
    </div>
  );
}

function Index() {
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProgrammeFormValues>({
    resolver: zodResolver(programmeSchema),
    defaultValues: VALEURS_FORMULAIRE_DEFAUT,
    mode: "onChange",
  });

  const modeFormation = watch("modeFormation");
  const afficherPlateforme = modeFormation.toLowerCase().includes("synchrone");

  const surGenerationIA = handleSubmit((valeurs) => {
    // La génération IA sera branchée à l'étape suivante.
    const programme = versProgrammeFormation(programmeSchema.parse(valeurs));
    void programme;
  });

  return (
    <div className="min-h-screen bg-background font-sans">
      <form
        className="mx-auto max-w-4xl px-4 py-8 sm:px-6"
        onSubmit={surGenerationIA}
        noValidate
      >
        {/* En-tête : logo + barre verticale bleu marine */}
        <header className="flex items-stretch gap-4">
          <img
            src="/logo.png"
            alt="Formatrix — Back to Business"
            className="h-14 w-auto"
          />
          <div className="w-0.5 bg-primary" aria-hidden="true" />
          <div className="flex flex-col justify-center">
            <p className="text-lg font-bold uppercase tracking-wide text-primary">
              Programme de formation
            </p>
            <p className="text-sm text-muted-foreground">
              Création du programme détaillé
            </p>
          </div>
        </header>

        <div className="mt-8 space-y-6">
          {/* 1. Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">
                1. Informations générales
              </CardTitle>
              <CardDescription>
                Intitulé de la formation et modalités de déroulement. Les
                champs marqués d'un astérisque sont obligatoires.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Champ
                id="titre"
                label="Titre de la formation"
                obligatoire
                erreur={errors.titre?.message}
              >
                <Input
                  id="titre"
                  placeholder="Ex. : Maîtriser la prospection commerciale"
                  aria-invalid={!!errors.titre}
                  {...register("titre")}
                />
              </Champ>
              <Champ
                id="sous-titre"
                label="Sous-titre (optionnel)"
                erreur={errors.sousTitre?.message}
              >
                <Input
                  id="sous-titre"
                  placeholder="Ex. : Construire un plan d'action commercial efficace"
                  aria-invalid={!!errors.sousTitre}
                  {...register("sousTitre")}
                />
              </Champ>
              <div className="grid gap-4 sm:grid-cols-2">
                <Champ id="mode-formation" label="Mode de formation">
                  <Controller
                    control={control}
                    name="modeFormation"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) =>
                          field.onChange(v as ModeFormation)
                        }
                      >
                        <SelectTrigger id="mode-formation">
                          <SelectValue placeholder="Choisir un mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {MODES_FORMATION.map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {mode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Champ>
                {afficherPlateforme && (
                  <Champ
                    id="plateforme"
                    label="Plateforme utilisée"
                    erreur={errors.plateforme?.message}
                  >
                    <Input
                      id="plateforme"
                      placeholder="Ex. : Teams, Zoom, Google Meet"
                      aria-invalid={!!errors.plateforme}
                      {...register("plateforme")}
                    />
                  </Champ>
                )}
                <Champ
                  id="duree"
                  label="Durée (en heures)"
                  obligatoire
                  erreur={errors.dureeHeures?.message}
                >
                  <Input
                    id="duree"
                    type="number"
                    min={0}
                    placeholder="Ex. : 14"
                    aria-invalid={!!errors.dureeHeures}
                    {...register("dureeHeures")}
                  />
                </Champ>
                <Champ
                  id="nombre-modules"
                  label="Nombre de modules"
                  hint="Contrainte donnée à l'IA pour le découpage du contenu."
                  erreur={errors.nombreModules?.message}
                >
                  <Input
                    id="nombre-modules"
                    type="number"
                    min={1}
                    aria-invalid={!!errors.nombreModules}
                    {...register("nombreModules")}
                  />
                </Champ>
              </div>
            </CardContent>
          </Card>

          {/* 2. Public & prérequis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">
                2. Public &amp; prérequis
              </CardTitle>
              <CardDescription>
                À qui s'adresse la formation et dans quelles conditions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Champ
                id="public"
                label="Public concerné"
                obligatoire
                erreur={errors.publicConcerne?.message}
              >
                <Textarea
                  id="public"
                  placeholder="Ex. : Dirigeants, indépendants, salariés en reconversion…"
                  rows={3}
                  aria-invalid={!!errors.publicConcerne}
                  {...register("publicConcerne")}
                />
              </Champ>
              <Champ
                id="prerequis"
                label="Prérequis"
                obligatoire
                erreur={errors.prerequis?.message}
              >
                <Textarea
                  id="prerequis"
                  placeholder="Ex. : Aucun prérequis / maîtrise de base de l'outil informatique…"
                  rows={3}
                  aria-invalid={!!errors.prerequis}
                  {...register("prerequis")}
                />
              </Champ>
              <Champ
                id="niveau"
                label="Niveau"
                obligatoire
                erreur={errors.niveau?.message}
              >
                <Controller
                  control={control}
                  name="niveau"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as Niveau)}
                    >
                      <SelectTrigger id="niveau" className="sm:w-64">
                        <SelectValue placeholder="Choisir un niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIVEAUX.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Champ>
            </CardContent>
          </Card>

          {/* 3. Organisation pédagogique */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">
                3. Organisation pédagogique
              </CardTitle>
              <CardDescription>
                Champs pré-remplis avec les valeurs de l'organisme, modifiables
                si besoin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Champ
                id="modalites-acces"
                label="Modalités d'accès"
                erreur={errors.modalitesAcces?.message}
              >
                <Textarea
                  id="modalites-acces"
                  rows={5}
                  {...register("modalitesAcces")}
                />
              </Champ>
              <Champ
                id="encadrement"
                label="Encadrement"
                erreur={errors.encadrement?.message}
              >
                <Textarea
                  id="encadrement"
                  rows={3}
                  {...register("encadrement")}
                />
              </Champ>
              <Champ
                id="coordination"
                label="Coordination pédagogique"
                erreur={errors.coordinationPedagogique?.message}
              >
                <Textarea
                  id="coordination"
                  rows={3}
                  {...register("coordinationPedagogique")}
                />
              </Champ>
              <Controller
                control={control}
                name="accompagnementPedagogique"
                render={({ field }) => (
                  <ListeEditable
                    label="Accompagnement pédagogique"
                    valeurs={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Champ
                id="suivi"
                label="Suivi de la formation"
                erreur={errors.suivi?.message}
              >
                <Textarea id="suivi" rows={3} {...register("suivi")} />
              </Champ>
              <Controller
                control={control}
                name="modalitesEvaluation"
                render={({ field }) => (
                  <ListeEditable
                    label="Modalités d'évaluation"
                    valeurs={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Champ
                id="validation"
                label="Validation de la formation"
                erreur={errors.validationFormation?.message}
              >
                <Textarea
                  id="validation"
                  rows={2}
                  {...register("validationFormation")}
                />
              </Champ>
              <div className="space-y-2">
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {PHRASE_METHODES_PEDAGOGIQUES}
                </p>
                <Controller
                  control={control}
                  name="methodesPedagogiques"
                  render={({ field }) => (
                    <ListeEditable
                      label="Méthodes pédagogiques"
                      valeurs={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Moyens pédagogiques spécifiques */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">
                4. Moyens pédagogiques spécifiques
              </CardTitle>
              <CardDescription>
                Matériel et ressources nécessaires au déroulement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="moyensPedagogiques"
                render={({ field }) => (
                  <ListeEditable
                    label="Moyens pédagogiques"
                    valeurs={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </CardContent>
          </Card>

          {/* 5. Génération IA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">5. Génération IA</CardTitle>
              <CardDescription>
                Génération des objectifs pédagogiques et du contenu des modules
                à partir des informations saisies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="submit"
                disabled={!isValid}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Générer le contenu par IA
              </Button>
              {!isValid && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Renseignez les 5 champs obligatoires (titre, durée, public
                  concerné, prérequis et niveau) pour activer la génération.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 6. Aperçu & exports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">
                6. Aperçu &amp; exports
              </CardTitle>
              <CardDescription>
                Prévisualisation du programme et téléchargement des documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed border-primary/40 bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">
                L'aperçu du programme détaillé s'affichera ici.
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button type="button" disabled variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger le PDF
                </Button>
                <Button type="button" disabled variant="outline" className="flex-1">
                  <FileText className="mr-2 h-4 w-4" />
                  Télécharger le Word
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Disponible à l'étape suivante — les exports seront activés une
                fois la génération des documents branchée.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
