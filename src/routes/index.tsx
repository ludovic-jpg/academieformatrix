import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

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
  versProgrammeFormation,
  VALEURS_FORMULAIRE_DEFAUT,
  type ProgrammeFormValues,
} from "@/lib/programme-schema";
import { genererProgramme } from "@/lib/generation.functions";

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
  hint?: string | undefined;
  erreur?: string | undefined;
  obligatoire?: boolean | undefined;
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
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProgrammeFormValues>({
    resolver: zodResolver(programmeSchema),
    defaultValues: VALEURS_FORMULAIRE_DEFAUT,
    mode: "onChange",
  });

  const [enCours, setEnCours] = useState(false);
  const [erreurGeneration, setErreurGeneration] = useState<string | null>(null);
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [erreurPdf, setErreurPdf] = useState<string | null>(null);

  const modeFormation = watch("modeFormation");
  const afficherPlateforme = modeFormation.toLowerCase().includes("synchrone");
  const modules = watch("modules");
  const objectifs = watch("objectifsPedagogiques");
  const pdfPret =
    objectifs.some((o) => o.trim().length > 0) &&
    modules.some((m) => m.titre.trim().length > 0 || m.points.length > 0);

  const telechargerPdf = async () => {
    setPdfEnCours(true);
    setErreurPdf(null);
    try {
      const valeurs = programmeSchema.parse(getValues());
      const programme = versProgrammeFormation(valeurs);
      // La librairie PDF s'appuie sur Buffer pour décoder le logo.
      const { Buffer } = await import("buffer");
      const global = globalThis as unknown as { Buffer?: unknown };
      if (!global.Buffer) global.Buffer = Buffer;
      const [{ pdf }, { ProgrammePdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/ProgrammePdf"),
      ]);
      const blob = await pdf(
        <ProgrammePdf programme={programme} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `Programme - ${programme.titre}.pdf`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErreurPdf(
        e instanceof Error
          ? e.message
          : "Une erreur est survenue pendant la création du PDF.",
      );
    } finally {
      setPdfEnCours(false);
    }
  };

  const surGenerationIA = handleSubmit(async (valeurs) => {
    setEnCours(true);
    setErreurGeneration(null);
    try {
      const sortie = await genererProgramme({
        data: {
          titre: valeurs.titre,
          dureeHeures: Number(valeurs.dureeHeures),
          publicConcerne: valeurs.publicConcerne,
          niveau: valeurs.niveau,
          prerequis: valeurs.prerequis,
          nombreModules: Number(valeurs.nombreModules),
        },
      });
      setValue("objectifsPedagogiques", sortie.objectifs, {
        shouldValidate: true,
      });
      setValue("modules", sortie.modules, { shouldValidate: true });
    } catch (e) {
      setErreurGeneration(
        e instanceof Error
          ? e.message
          : "Une erreur est survenue pendant la génération.",
      );
    } finally {
      setEnCours(false);
    }
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
            <CardContent className="space-y-6">
              <div>
                <Button
                  type="submit"
                  disabled={!isValid || enCours}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {enCours ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {enCours
                    ? "Génération en cours…"
                    : modules.length > 0
                      ? "Régénérer le contenu par IA"
                      : "Générer le contenu par IA"}
                </Button>
                {!isValid && !enCours && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Renseignez les 5 champs obligatoires (titre, durée, public
                    concerné, prérequis et niveau) pour activer la génération.
                  </p>
                )}
                {enCours && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    La rédaction peut prendre une à deux minutes, merci de
                    patienter.
                  </p>
                )}
                {erreurGeneration && (
                  <p className="mt-2 text-xs font-medium text-destructive">
                    {erreurGeneration}
                  </p>
                )}
              </div>

              {modules.length > 0 && (
                <div className="space-y-6 border-t pt-6">
                  <Controller
                    control={control}
                    name="objectifsPedagogiques"
                    render={({ field }) => (
                      <ListeEditable
                        label="Objectifs pédagogiques (modifiables)"
                        valeurs={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="modules"
                    render={({ field }) => {
                      const majModules = (
                        modulesMaj: { titre: string; points: string[] }[],
                      ) => field.onChange(modulesMaj);
                      const majTitre = (index: number, titre: string) =>
                        majModules(
                          field.value.map((m, i) =>
                            i === index ? { ...m, titre } : m,
                          ),
                        );
                      const majPoints = (index: number, points: string[]) =>
                        majModules(
                          field.value.map((m, i) =>
                            i === index ? { ...m, points } : m,
                          ),
                        );
                      return (
                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-primary">
                            Modules (modifiables)
                          </Label>
                          {field.value.map((module, index) => (
                            <div
                              key={index}
                              className="space-y-3 rounded-md border p-4"
                            >
                              <div className="flex items-center gap-2">
                                <Input
                                  value={module.titre}
                                  onChange={(e) =>
                                    majTitre(index, e.target.value)
                                  }
                                  placeholder={`Titre du module ${index + 1}`}
                                  className="font-semibold"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    majModules(
                                      field.value.filter((_, i) => i !== index),
                                    )
                                  }
                                  aria-label={`Supprimer le module ${index + 1}`}
                                  className="shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <ListeEditable
                                label="Points de contenu"
                                valeurs={module.points}
                                onChange={(points) => majPoints(index, points)}
                              />
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              majModules([
                                ...field.value,
                                { titre: "", points: [""] },
                              ])
                            }
                            className="border-dashed"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter un module
                          </Button>
                        </div>
                      );
                    }}
                  />
                </div>
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
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={!pdfPret || pdfEnCours}
                  onClick={telechargerPdf}
                >
                  {pdfEnCours ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {pdfEnCours ? "Préparation du PDF…" : "Télécharger le PDF"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={!pdfPret || wordEnCours}
                  onClick={telechargerWord}
                >
                  {wordEnCours ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {wordEnCours
                    ? "Préparation du Word…"
                    : "Télécharger le Word"}
                </Button>
              </div>
              {(erreurPdf || erreurWord) && (
                <p className="mt-2 text-xs font-medium text-destructive">
                  {erreurPdf ?? erreurWord}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {pdfPret
                  ? "Les documents reprennent la charte Formatrix (en-tête, encadré du titre et pied de page sur chaque page)."
                  : "Générez d'abord les objectifs et les modules pour activer les téléchargements."}
              </p>

            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
