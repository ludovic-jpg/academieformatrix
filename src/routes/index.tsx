import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, ShieldCheck, Sparkles } from "lucide-react";

import { EnTeteFormatrix } from "@/components/EnTeteFormatrix";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Formatrix — Espace formateur et programmes de formation" },
      {
        name: "description",
        content:
          "Formatrix : créez vos programmes de formation conformes Qualiopi, vos tests de positionnement et vos évaluations, et partagez vos supports avec vos apprenants.",
      },
      {
        property: "og:title",
        content: "Formatrix — Espace formateur",
      },
      {
        property: "og:description",
        content:
          "Programmes de formation, tests de positionnement, évaluations des acquis et coffre-fort pédagogique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Accueil,
});

function Accueil() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <EnTeteFormatrix
          titre="Formatrix"
          sousTitre="Espace formateur — Back to Business"
        />

        <div className="mt-10 space-y-4">
          <h1 className="text-3xl font-bold text-primary">
            Vos programmes de formation, de la rédaction au partage
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Rédigez des programmes conformes aux exigences Qualiopi, générez vos
            tests de positionnement et vos évaluations des acquis, puis mettez
            vos supports à disposition de vos apprenants.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/intranet/profil">
                Accéder à l'espace formateur
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">Se connecter</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-primary">Programmes</CardTitle>
              <CardDescription>
                Rédaction assistée, export PDF et Word à la charte Formatrix.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-primary">Évaluations</CardTitle>
              <CardDescription>
                Tests de positionnement et évaluations des acquis par formation.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-primary">Coffre-fort</CardTitle>
              <CardDescription>
                Vos supports, partagés en lecture seule avec vos apprenants.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <CardContent className="mt-12 px-0 text-xs text-muted-foreground">
          <Link to="/politique-confidentialite" className="underline">
            Politique de confidentialité
          </Link>
        </CardContent>
      </div>
    </div>
  );
}
