import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

import { EnTeteFormatrix } from "@/components/EnTeteFormatrix";
import { PhotoProfil } from "@/components/PhotoProfil";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/intranet")({
  component: Intranet,
});

const ONGLETS = [
  { to: "/intranet/profil", label: "Profil" },
  { to: "/intranet/formations", label: "Mes Formations" },
  { to: "/intranet/positionnement", label: "Test de Positionnement" },
  { to: "/intranet/acquis", label: "Évaluation des Acquis" },
  { to: "/intranet/coffre", label: "Coffre-fort pédagogique" },
  { to: "/intranet/budget", label: "Demande de budget" },
] as const;

function Intranet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [estAdmin, setEstAdmin] = useState(false);
  const [prenom, setPrenom] = useState("");

  useEffect(() => {
    let annule = false;
    (async () => {
      const { data: utilisateur } = await supabase.auth.getUser();
      if (!utilisateur.user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", utilisateur.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!annule) setEstAdmin(!!data);
      const { data: profil } = await supabase
        .from("profils_formateurs")
        .select("prenom")
        .eq("user_id", utilisateur.user.id)
        .maybeSingle();
      if (!annule) setPrenom(profil?.prenom ?? "");
    })();
    return () => {
      annule = true;
    };
  }, []);

  const seDeconnecter = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <EnTeteFormatrix
            titre="Espace formateur"
            sousTitre={
              prenom
                ? `Bienvenue ${prenom} dans ton espace formateur`
                : "Bienvenue dans ton espace formateur"
            }
          />
          <div className="flex items-center gap-3">
            <PhotoProfil />
            <Button variant="outline" size="sm" onClick={seDeconnecter}>
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        </div>

        <nav className="mt-8 flex flex-wrap gap-2 border-b pb-2">
          {ONGLETS.map((onglet) => (
            <Link
              key={onglet.to}
              to={onglet.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              activeProps={{
                className:
                  "rounded-md px-3 py-2 text-sm font-bold text-primary bg-accent",
              }}
            >
              {onglet.label}
            </Link>
          ))}
          {estAdmin && (
            <Link
              to="/intranet/admin"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              activeProps={{
                className:
                  "rounded-md px-3 py-2 text-sm font-bold text-primary bg-accent",
              }}
            >
              Administration
            </Link>
          )}
        </nav>

        <div className="mt-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
