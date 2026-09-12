import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion à l'espace formateur — Formatrix" },
      {
        name: "description",
        content:
          "Connectez-vous à l'espace formateur Formatrix pour gérer votre profil, vos formations, vos évaluations et votre coffre-fort pédagogique.",
      },
      { property: "og:title", content: "Connexion — Formatrix" },
      {
        property: "og:description",
        content: "Accès réservé aux formateurs Formatrix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/intranet/profil", replace: true });
    });
  }, [navigate]);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    setMessage(null);
    try {
      if (mode === "inscription") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: motDePasse,
          options: { emailRedirectTo: window.location.origin + "/login" },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/intranet/profil", replace: true });
        } else {
          setMessage(
            "Compte créé. Vérifiez votre boîte mail et cliquez sur le lien de confirmation pour activer votre accès.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: motDePasse,
        });
        if (error) throw error;
        navigate({ to: "/intranet/profil", replace: true });
      }
    } catch (err) {
      setErreur(
        err instanceof Error
          ? err.message
          : "La connexion a échoué. Vérifiez vos identifiants.",
      );
    } finally {
      setEnCours(false);
    }
  };

  const connexionGoogle = async () => {
    setErreur(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setErreur("La connexion avec Google a échoué.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/intranet/profil", replace: true });
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <EnTeteFormatrix titre="Espace formateur" sousTitre="Accès réservé" />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-primary">
              {mode === "connexion" ? "Connexion" : "Créer un compte"}
            </CardTitle>
            <CardDescription>
              {mode === "connexion"
                ? "Saisissez vos identifiants pour accéder à votre espace."
                : "Créez votre accès formateur avec votre adresse professionnelle."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={soumettre} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-primary">
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="motdepasse"
                  className="text-sm font-bold text-primary"
                >
                  Mot de passe
                </Label>
                <Input
                  id="motdepasse"
                  type="password"
                  autoComplete={
                    mode === "connexion" ? "current-password" : "new-password"
                  }
                  required
                  minLength={6}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                />
              </div>
              {erreur && (
                <p className="text-xs font-medium text-destructive">{erreur}</p>
              )}
              {message && (
                <p className="text-xs font-medium text-primary">{message}</p>
              )}
              <Button type="submit" className="w-full" disabled={enCours}>
                {enCours && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
              </Button>
            </form>

            <div className="relative py-2 text-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">
                ou
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={connexionGoogle}
            >
              Continuer avec Google
            </Button>

            <button
              type="button"
              className="w-full text-xs text-muted-foreground underline"
              onClick={() =>
                setMode(mode === "connexion" ? "inscription" : "connexion")
              }
            >
              {mode === "connexion"
                ? "Pas encore de compte ? Créer un compte"
                : "J'ai déjà un compte — me connecter"}
            </button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/politique-confidentialite" className="underline">
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </div>
  );
}
