import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Download, Eye, Loader2, Upload, FileText, Layout } from "lucide-react";

import { EnTeteFormatrix } from "@/components/EnTeteFormatrix";
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
import { QUESTIONS_RECUEIL, TITRE_RECUEIL } from "@/config/recueil";
import {
  confirmerDepotDossier,
  consulterDossier,
  enregistrerRecueil,
  preparerDepotDossier,
} from "@/lib/dossier.functions";
import {
  telechargerQuestionnairePdf,
  telechargerRecueilPdf,
} from "@/lib/documents";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/dossier/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mon espace de formation — Formatrix" },
      {
        name: "description",
        content:
          "Retrouvez vos supports pédagogiques, votre recueil des besoins et vos documents à compléter puis à renvoyer signés.",
      },
      { property: "og:title", content: "Mon espace de formation — Formatrix" },
      {
        property: "og:description",
        content:
          "Supports, recueil des besoins et documents de votre parcours de formation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EspaceApprenant,
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">
        Ce lien n'est plus valide. Contactez votre formateur.
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">Espace introuvable.</p>
    </div>
  ),
});

type TypeDocument = "recueil" | "positionnement" | "acquis" | "autre";

function EspaceApprenant() {
  const { jeton } = Route.useParams();
  const consulter = useServerFn(consulterDossier);
  const enregistrer = useServerFn(enregistrerRecueil);
  const preparer = useServerFn(preparerDepotDossier);
  const confirmer = useServerFn(confirmerDepotDossier);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dossier", jeton],
    queryFn: () => consulter({ data: { jeton } }),
    retry: false,
  });

  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState<TypeDocument | null>(null);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (data) setReponses(data.reponsesRecueil ?? {});
  }, [data]);

  const infosRecueil = {
    nomStagiaire: `${data?.apprenantPrenom ?? ""} ${data?.apprenantNom ?? ""}`.trim(),
    titreFormation: data?.titreFormation ?? "",
    dureeHeures: data?.dureeHeures ?? 0,
    formateur: data?.formateur ?? "",
    date: new Date().toLocaleDateString("fr-FR"),
  };

  const sauverRecueil = async (definitif: boolean) => {
    setSauvegarde(true);
    setErreur(null);
    setMessage(null);
    try {
      await enregistrer({ data: { jeton, reponses, definitif } });
      setMessage(
        definitif
          ? "Votre recueil des besoins a été transmis à votre formateur."
          : "Vos réponses ont été enregistrées.",
      );
      await refetch();
    } catch {
      setErreur("L'enregistrement a échoué, réessayez.");
    }
    setSauvegarde(false);
  };

  const deposer = async (type: TypeDocument, fichier: File) => {
    setEnvoi(type);
    setErreur(null);
    setMessage(null);
    try {
      if (fichier.size > 50 * 1024 * 1024) {
        throw new Error("Ce fichier dépasse 50 Mo.");
      }
      const prepare = await preparer({
        data: { jeton, type, nom: fichier.name },
      });
      const reponse = await fetch(prepare.url, {
        method: "PUT",
        body: fichier,
      });
      if (!reponse.ok) throw new Error("Le transfert a échoué.");
      await confirmer({
        data: {
          jeton,
          type,
          nom: fichier.name,
          chemin: prepare.chemin,
          taille: fichier.size,
        },
      });
      setMessage("Votre document a bien été transmis.");
      await refetch();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le dépôt a échoué.");
    }
    setEnvoi(null);
  };

  const documentsDe = (type: TypeDocument) =>
    (data?.documentsDeposes ?? []).filter((d) => d.type === type);

  const blocDepot = (type: TypeDocument) => (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="file"
        className="max-w-xs"
        aria-label="Déposer le document rempli et signé"
        onChange={(e) => {
          const fichier = e.target.files?.[0];
          if (fichier) void deposer(type, fichier);
          e.target.value = "";
        }}
      />
      {envoi === type ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <Upload className="h-4 w-4 text-muted-foreground" />
      )}
      {documentsDe(type).length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <Check className="h-3 w-3" /> Reçu
        </span>
      )}
    </div>
  );

  const fichiersParModule = (data?.fichiersCoffre ?? []).reduce((acc, f) => {
    const match = f.nom.match(/Module ([0-9]+)/);
    const mod = match ? "Module " + match[1] : "Général";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(f);
    return acc;
  }, {} as Record<string, typeof data.fichiersCoffre>);

  const handlePreview = (f: { nom: string; url: string }) => {
    if (f.nom.endsWith(".pdf")) {
      setPreviewUrl(f.url);
    } else if (f.nom.endsWith(".pptx")) {
      // Pour les PPTX, on cherche s'il y a un PDF correspondant (même nom de base)
      const baseName = f.nom.replace(".pptx", "");
      const pdfEquiv = data?.fichiersCoffre.find(pdf => pdf.nom === baseName + ".pdf");
      if (pdfEquiv) {
        setPreviewUrl(pdfEquiv.url);
      } else {
        // Fallback : ouverture directe (téléchargement par le navigateur)
        window.open(f.url, "_blank");
      }
    } else {
      window.open(f.url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <EnTeteFormatrix
          titre="Mon espace de formation"
          sousTitre={
            data
              ? `${infosRecueil.nomStagiaire} — ${data.titreFormation}`
              : "Chargement…"
          }
        />

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            Ce lien n'est plus valide. Contactez votre formateur.
          </p>
        )}

        {data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Layout className="h-5 w-5" /> Coffre-fort pédagogique
                </CardTitle>
                <CardDescription>
                  Supports de cours, exercices et ressources de votre parcours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(fichiersParModule).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun support disponible pour le moment.
                  </p>
                )}
                {Object.entries(fichiersParModule).map(([mod, fs]) => (
                  <div key={mod} className="space-y-3">
                    <h3 className="text-sm font-bold text-primary border-b pb-1">{mod}</h3>
                    <div className="grid gap-2">
                      {fs.map((f) => (
                        <div
                          key={f.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {f.nom.endsWith(".pdf") ? (
                              <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                            ) : f.nom.endsWith(".pptx") ? (
                              <Layout className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            )}
                            <span className="truncate">{f.nom}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handlePreview(f)}>
                              <Eye className="h-4 w-4 mr-2" /> Aperçu
                            </Button>
                            <a href={f.url} download={f.nom}>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4 text-primary" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-primary">{TITRE_RECUEIL}</CardTitle>
                <CardDescription>
                  Remplissez-le directement en ligne, ou téléchargez-le pour le
                  signer puis le renvoyer.
                  {data.recueilSoumis ? " Déjà transmis à votre formateur." : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void telechargerRecueilPdf(infosRecueil, reponses)
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger le PDF
                  </Button>
                </div>

                {QUESTIONS_RECUEIL.map((question) => (
                  <div key={question.cle} className="space-y-2">
                    <Label
                      htmlFor={question.cle}
                      className="text-sm font-bold text-primary"
                    >
                      {question.intitule}
                    </Label>
                    <Textarea
                      id={question.cle}
                      rows={question.type === "texte" ? 3 : 2}
                      maxLength={4000}
                      value={reponses[question.cle] ?? ""}
                      onChange={(e) =>
                        setReponses((r) => ({
                          ...r,
                          [question.cle]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={sauvegarde}
                    onClick={() => void sauverRecueil(false)}
                  >
                    Enregistrer le brouillon
                  </Button>
                  <Button
                    disabled={sauvegarde}
                    onClick={() => void sauverRecueil(true)}
                  >
                    {sauvegarde && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Transmettre à mon formateur
                  </Button>
                </div>

                <div className="space-y-2 rounded-md border p-4">
                  <p className="text-sm font-bold text-primary">
                    Déposer le recueil rempli et signé
                  </p>
                  {blocDepot("recueil")}
                </div>
              </CardContent>
            </Card>

            {(["positionnement", "acquis"] as const).map((type) => {
              const questionnaire = data.questionnaires.find(
                (q) => q.type === type,
              );
              const libelle =
                type === "positionnement"
                  ? "Test de positionnement"
                  : "Évaluation des acquis";
              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="text-primary">{libelle}</CardTitle>
                    <CardDescription>
                      Téléchargez le document, complétez-le et signez-le, puis
                      déposez-le ici.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {questionnaire ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void telechargerQuestionnairePdf({
                            titre: questionnaire.titre || libelle,
                            questions: questionnaire.questions,
                          })
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger le PDF
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Votre formateur n'a pas encore mis ce document à
                        disposition.
                      </p>
                    )}
                    {blocDepot(type)}
                    {documentsDe(type).map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-xs text-muted-foreground underline"
                      >
                        {doc.nom}
                      </a>
                    ))}
                  </CardContent>
                </Card>
              );
            })}

            {erreur && (
              <p className="text-xs font-medium text-destructive">{erreur}</p>
            )}
            {message && (
              <p className="text-xs font-medium text-primary">{message}</p>
            )}
          </>
        )}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <DialogTitle>Aperçu du support</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full border-none"
                title="Aperçu du support"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
