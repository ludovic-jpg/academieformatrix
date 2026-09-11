import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  VALEURS_DEFAUT,
  type ModeFormation,
  type Niveau,
} from "@/config/programme";

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
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-bold text-primary">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
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
  const [titre, setTitre] = useState("");
  const [sousTitre, setSousTitre] = useState("");
  const [modeFormation, setModeFormation] = useState<ModeFormation>("Présentiel");
  const [plateforme, setPlateforme] = useState("");
  const [dureeHeures, setDureeHeures] = useState("");
  const [nombreModules, setNombreModules] = useState("3");
  const [publicConcerne, setPublicConcerne] = useState("");
  const [prerequis, setPrerequis] = useState("");
  const [niveau, setNiveau] = useState<Niveau>("Débutant");
  const [modalitesAcces, setModalitesAcces] = useState(VALEURS_DEFAUT.modalitesAcces);
  const [encadrement, setEncadrement] = useState(VALEURS_DEFAUT.encadrement);
  const [coordinationPedagogique, setCoordinationPedagogique] = useState(
    VALEURS_DEFAUT.coordinationPedagogique,
  );
  const [suivi, setSuivi] = useState(VALEURS_DEFAUT.suivi);
  const [validationFormation, setValidationFormation] = useState(
    VALEURS_DEFAUT.validationFormation,
  );
  const [accompagnementPedagogique, setAccompagnementPedagogique] = useState<
    string[]
  >([...VALEURS_DEFAUT.accompagnementPedagogique]);
  const [modalitesEvaluation, setModalitesEvaluation] = useState<string[]>([
    ...VALEURS_DEFAUT.modalitesEvaluation,
  ]);
  const [methodesPedagogiques, setMethodesPedagogiques] = useState<string[]>([
    ...VALEURS_DEFAUT.methodesPedagogiques,
  ]);
  const [moyensPedagogiques, setMoyensPedagogiques] = useState<string[]>([
    ...VALEURS_DEFAUT.moyensPedagogiques,
  ]);

  const afficherPlateforme = modeFormation.toLowerCase().includes("synchrone");

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
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
                Intitulé de la formation et modalités de déroulement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Champ id="titre" label="Titre de la formation">
                <Input
                  id="titre"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex. : Maîtriser la prospection commerciale"
                />
              </Champ>
              <Champ id="sous-titre" label="Sous-titre (optionnel)">
                <Input
                  id="sous-titre"
                  value={sousTitre}
                  onChange={(e) => setSousTitre(e.target.value)}
                  placeholder="Ex. : Construire un plan d'action commercial efficace"
                />
              </Champ>
              <div className="grid gap-4 sm:grid-cols-2">
                <Champ id="mode-formation" label="Mode de formation">
                  <Select
                    value={modeFormation}
                    onValueChange={(v) => setModeFormation(v as ModeFormation)}
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
                </Champ>
                {afficherPlateforme && (
                  <Champ id="plateforme" label="Plateforme utilisée">
                    <Input
                      id="plateforme"
                      value={plateforme}
                      onChange={(e) => setPlateforme(e.target.value)}
                      placeholder="Ex. : Teams, Zoom, Google Meet"
                    />
                  </Champ>
                )}
                <Champ id="duree" label="Durée (en heures)">
                  <Input
                    id="duree"
                    type="number"
                    min={0}
                    value={dureeHeures}
                    onChange={(e) => setDureeHeures(e.target.value)}
                    placeholder="Ex. : 14"
                  />
                </Champ>
                <Champ
                  id="nombre-modules"
                  label="Nombre de modules"
                  hint="Contrainte donnée à l'IA pour le découpage du contenu."
                >
                  <Input
                    id="nombre-modules"
                    type="number"
                    min={1}
                    value={nombreModules}
                    onChange={(e) => setNombreModules(e.target.value)}
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
              <Champ id="public" label="Public concerné">
                <Textarea
                  id="public"
                  value={publicConcerne}
                  onChange={(e) => setPublicConcerne(e.target.value)}
                  placeholder="Ex. : Dirigeants, indépendants, salariés en reconversion…"
                  rows={3}
                />
              </Champ>
              <Champ id="prerequis" label="Prérequis">
                <Textarea
                  id="prerequis"
                  value={prerequis}
                  onChange={(e) => setPrerequis(e.target.value)}
                  placeholder="Ex. : Aucun prérequis / maîtrise de base de l'outil informatique…"
                  rows={3}
                />
              </Champ>
              <Champ id="niveau" label="Niveau">
                <Select
                  value={niveau}
                  onValueChange={(v) => setNiveau(v as Niveau)}
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
              <Champ id="modalites-acces" label="Modalités d'accès">
                <Textarea
                  id="modalites-acces"
                  value={modalitesAcces}
                  onChange={(e) => setModalitesAcces(e.target.value)}
                  rows={5}
                />
              </Champ>
              <Champ id="encadrement" label="Encadrement">
                <Textarea
                  id="encadrement"
                  value={encadrement}
                  onChange={(e) => setEncadrement(e.target.value)}
                  rows={3}
                />
              </Champ>
              <Champ
                id="coordination"
                label="Coordination pédagogique"
              >
                <Textarea
                  id="coordination"
                  value={coordinationPedagogique}
                  onChange={(e) => setCoordinationPedagogique(e.target.value)}
                  rows={3}
                />
              </Champ>
              <ListeEditable
                label="Accompagnement pédagogique"
                valeurs={accompagnementPedagogique}
                onChange={setAccompagnementPedagogique}
              />
              <Champ id="suivi" label="Suivi de la formation">
                <Textarea
                  id="suivi"
                  value={suivi}
                  onChange={(e) => setSuivi(e.target.value)}
                  rows={3}
                />
              </Champ>
              <ListeEditable
                label="Modalités d'évaluation"
                valeurs={modalitesEvaluation}
                onChange={setModalitesEvaluation}
              />
              <Champ id="validation" label="Validation de la formation">
                <Textarea
                  id="validation"
                  value={validationFormation}
                  onChange={(e) => setValidationFormation(e.target.value)}
                  rows={2}
                />
              </Champ>
              <div className="space-y-2">
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {PHRASE_METHODES_PEDAGOGIQUES}
                </p>
                <ListeEditable
                  label="Méthodes pédagogiques"
                  valeurs={methodesPedagogiques}
                  onChange={setMethodesPedagogiques}
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
              <ListeEditable
                label="Moyens pédagogiques"
                valeurs={moyensPedagogiques}
                onChange={setMoyensPedagogiques}
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
              <Button type="button" disabled size="lg" className="w-full sm:w-auto">
                <Sparkles className="mr-2 h-4 w-4" />
                Générer le contenu par IA
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Disponible à l'étape suivante — le bouton sera activé une fois
                la génération IA branchée.
              </p>
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
      </div>
    </div>
  );
}
