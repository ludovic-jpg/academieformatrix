import { useEffect, useState } from "react";
import { Download, Eye, Loader2, Save, Sparkles, Trash2 } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ProgrammeFormation } from "@/config/programme";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  genererQuestionnaire,
  type QuestionQcm,
} from "@/lib/questionnaire.functions";
import { telechargerQuestionnairePdf } from "@/lib/documents";

interface Formation {
  id: string;
  titre: string;
  niveau: string;
  programme: ProgrammeFormation;
}

interface QuestionnaireEnregistre {
  id: string;
  formation_id: string;
  titre: string;
  created_at: string;
  questions: QuestionQcm[];
}

function resumeContenu(programme: ProgrammeFormation) {
  const objectifs = (programme.objectifsPedagogiques ?? []).join("\n- ");
  const modules = (programme.modules ?? [])
    .map((m) => `${m.titre}\n  - ${m.points.join("\n  - ")}`)
    .join("\n");
  return `Objectifs :\n- ${objectifs}\n\nModules :\n${modules}`;
}

export function EspaceQuestionnaire({
  type,
  intitule,
  nombreQuestions,
}: {
  type: "positionnement" | "acquis";
  intitule: string;
  nombreQuestions: number;
}) {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formationId, setFormationId] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionQcm[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [archives, setArchives] = useState<QuestionnaireEnregistre[]>([]);
  const [apercu, setApercu] = useState<QuestionnaireEnregistre | null>(null);

  const charger = async () => {
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) return;
    const { data: formationsData } = await supabase
      .from("formations")
      .select("id, titre, niveau, programme")
      .eq("formateur_id", utilisateur.user.id)
      .order("created_at", { ascending: false });
    setFormations((formationsData ?? []) as unknown as Formation[]);

    const { data: archivesData } = await supabase
      .from("questionnaires")
      .select("id, formation_id, titre, created_at, questions")
      .eq("formateur_id", utilisateur.user.id)
      .eq("type", type)
      .order("created_at", { ascending: false });
    setArchives((archivesData ?? []) as unknown as QuestionnaireEnregistre[]);
  };

  useEffect(() => {
    void charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const formation = formations.find((f) => f.id === formationId);

  const generer = async () => {
    if (!formation) return;
    setEnCours(true);
    setErreur(null);
    setMessage(null);
    try {
      const sortie = await genererQuestionnaire({
        data: {
          titre: formation.titre,
          niveau: formation.niveau || "Débutant",
          publicConcerne: formation.programme.publicConcerne ?? "",
          contenu: resumeContenu(formation.programme),
          nombreQuestions,
          type,
        },
      });
      setQuestions(sortie.questions);
    } catch (e) {
      setErreur(
        e instanceof Error
          ? e.message
          : "Une erreur est survenue pendant la génération.",
      );
    } finally {
      setEnCours(false);
    }
  };

  const enregistrer = async () => {
    if (!formation || questions.length === 0) return;
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) {
      setErreur("Session expirée.");
      setEnregistrement(false);
      return;
    }
    const { error } = await supabase.from("questionnaires").insert({
      formateur_id: utilisateur.user.id,
      formation_id: formation.id,
      type,
      titre: `${intitule} — ${formation.titre}`,
      questions: JSON.parse(JSON.stringify(questions)) as Json,
    });
    if (error) setErreur("L'enregistrement a échoué : " + error.message);
    else {
      setMessage("Questionnaire enregistré dans les archives.");
      await charger();
    }
    setEnregistrement(false);
  };

  const supprimer = async (id: string) => {
    await supabase.from("questionnaires").delete().eq("id", id);
    if (apercu?.id === id) setApercu(null);
    await charger();
  };

  const majQuestion = (index: number, maj: Partial<QuestionQcm>) =>
    setQuestions((qs) =>
      qs.map((q, i) => (i === index ? { ...q, ...maj } : q)),
    );

  return (
    <Tabs defaultValue="generateur">
      <TabsList>
        <TabsTrigger value="generateur">Générateur</TabsTrigger>
        <TabsTrigger value="archives">Archives</TabsTrigger>
      </TabsList>

      <TabsContent value="generateur" className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">{intitule}</CardTitle>
            <CardDescription>
              Choisissez une formation enregistrée, puis générez{" "}
              {nombreQuestions} questions à choix multiples adaptées à son
              niveau et à son contenu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-primary">
                Formation
              </Label>
              <Select value={formationId} onValueChange={setFormationId}>
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

            <Button
              type="button"
              onClick={generer}
              disabled={!formation || enCours}
            >
              {enCours ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {enCours
                ? "Génération en cours…"
                : questions.length > 0
                  ? "Régénérer les questions"
                  : "Générer les questions par IA"}
            </Button>
            {erreur && (
              <p className="text-xs font-medium text-destructive">{erreur}</p>
            )}
            {message && (
              <p className="text-xs font-medium text-primary">{message}</p>
            )}
          </CardContent>
        </Card>

        {questions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">
                Questions (modifiables)
              </CardTitle>
              <CardDescription>
                Ajustez les intitulés, les propositions et la bonne réponse
                avant d'enregistrer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {questions.map((q, index) => (
                <div key={index} className="space-y-3 rounded-md border p-4">
                  <div className="flex items-start gap-2">
                    <Textarea
                      value={q.question}
                      rows={2}
                      onChange={(e) =>
                        majQuestion(index, { question: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Supprimer la question ${index + 1}`}
                      onClick={() =>
                        setQuestions((qs) => qs.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {q.propositions.map((proposition, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`bonne-${index}`}
                          checked={q.bonneReponse === j}
                          onChange={() =>
                            majQuestion(index, { bonneReponse: j })
                          }
                          aria-label={`Bonne réponse : proposition ${j + 1}`}
                        />
                        <Input
                          value={proposition}
                          onChange={(e) =>
                            majQuestion(index, {
                              propositions: q.propositions.map((p, k) =>
                                k === j ? e.target.value : p,
                              ),
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                onClick={enregistrer}
                disabled={enregistrement}
              >
                {enregistrement ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Enregistrer
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void telechargerQuestionnairePdf({
                      titre: `${intitule} — ${formation?.titre ?? ""}`,
                      questions,
                    })
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger le PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void telechargerQuestionnairePdf({
                      titre: `${intitule} — ${formation?.titre ?? ""}`,
                      questions,
                      avecCorrige: true,
                    })
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF corrigé
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="archives" className="mt-6 space-y-4">
        {formations.map((f) => {
          const liste = archives.filter((a) => a.formation_id === f.id);
          if (liste.length === 0) return null;
          return (
            <Card key={f.id}>
              <CardHeader>
                <CardTitle className="text-primary">{f.titre}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {liste.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <p className="text-sm text-muted-foreground">
                      {intitule} —{" "}
                      {new Date(a.created_at).toLocaleDateString("fr-FR")} —{" "}
                      {a.questions.length} questions
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setApercu(a)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void telechargerQuestionnairePdf({
                            titre: a.titre,
                            questions: a.questions,
                          })
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void telechargerQuestionnairePdf({
                            titre: a.titre,
                            questions: a.questions,
                            avecCorrige: true,
                          })
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        PDF corrigé
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void supprimer(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
        {archives.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun questionnaire enregistré pour l'instant.
          </p>
        )}

        {apercu && (
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">{apercu.titre}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {apercu.questions.map((q, i) => (
                <div key={i}>
                  <p className="font-bold text-primary">
                    {i + 1}. {q.question}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {q.propositions.map((p, j) => (
                      <li
                        key={j}
                        className={
                          j === q.bonneReponse ? "font-bold text-primary" : ""
                        }
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApercu(null)}
              >
                Fermer l'aperçu
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
