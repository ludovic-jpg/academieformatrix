import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Eye, FileText, Loader2, Trash2 } from "lucide-react";

import { GenerateurProgramme } from "@/components/GenerateurProgramme";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProgrammeFormation } from "@/config/programme";
import { supabase } from "@/integrations/supabase/client";
import {
  telechargerProgrammePdf,
  telechargerProgrammeWord,
} from "@/lib/documents";

export const Route = createFileRoute("/_authenticated/intranet/formations")({
  component: Formations,
});

export interface FormationEnregistree {
  id: string;
  titre: string;
  niveau: string;
  duree_heures: number;
  created_at: string;
  programme: ProgrammeFormation;
}

export async function chargerFormations(): Promise<FormationEnregistree[]> {
  const { data: utilisateur } = await supabase.auth.getUser();
  if (!utilisateur.user) return [];
  const { data } = await supabase
    .from("formations")
    .select("id, titre, niveau, duree_heures, created_at, programme")
    .eq("formateur_id", utilisateur.user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as FormationEnregistree[];
}

function Formations() {
  const [formations, setFormations] = useState<FormationEnregistree[]>([]);
  const [chargement, setChargement] = useState(true);
  const [apercu, setApercu] = useState<FormationEnregistree | null>(null);

  const rafraichir = async () => {
    setFormations(await chargerFormations());
    setChargement(false);
  };

  useEffect(() => {
    void rafraichir();
  }, []);

  const enregistrer = async (programme: ProgrammeFormation) => {
    const { data: utilisateur } = await supabase.auth.getUser();
    if (!utilisateur.user) throw new Error("Session expirée.");
    const { error } = await supabase.from("formations").insert({
      formateur_id: utilisateur.user.id,
      titre: programme.titre,
      niveau: programme.niveau,
      duree_heures: programme.dureeHeures,
      programme: programme as unknown as Record<string, unknown>,
    });
    if (error) throw new Error(error.message);
    await rafraichir();
  };

  const supprimer = async (formation: FormationEnregistree) => {
    if (
      !window.confirm(
        `Supprimer définitivement la formation « ${formation.titre} » ?`,
      )
    )
      return;
    await supabase.from("formations").delete().eq("id", formation.id);
    await rafraichir();
  };

  return (
    <Tabs defaultValue="generateur">
      <TabsList>
        <TabsTrigger value="generateur">Générateur</TabsTrigger>
        <TabsTrigger value="archives">Archives</TabsTrigger>
      </TabsList>

      <TabsContent value="generateur" className="mt-6">
        <GenerateurProgramme onEnregistrer={enregistrer} />
      </TabsContent>

      <TabsContent value="archives" className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Mes formations</CardTitle>
            <CardDescription>
              Formations enregistrées dans votre espace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {chargement && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </p>
            )}
            {!chargement && formations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune formation enregistrée pour l'instant.
              </p>
            )}
            {formations.map((formation) => (
              <div
                key={formation.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
              >
                <div>
                  <p className="font-bold text-primary">{formation.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    {formation.niveau} — {formation.duree_heures} h —{" "}
                    {new Date(formation.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setApercu(formation)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Voir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => telechargerProgrammePdf(formation.programme)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      telechargerProgrammeWord(formation.programme)
                    }
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Word
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void supprimer(formation)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {apercu && (
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">{apercu.titre}</CardTitle>
              <CardDescription>
                {apercu.programme.publicConcerne}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-bold text-primary">
                  Objectifs pédagogiques
                </p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {apercu.programme.objectifsPedagogiques.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
              {apercu.programme.modules.map((module, i) => (
                <div key={i}>
                  <p className="font-bold text-primary">{module.titre}</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {module.points.map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setApercu(null)}>
                Fermer l'aperçu
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
