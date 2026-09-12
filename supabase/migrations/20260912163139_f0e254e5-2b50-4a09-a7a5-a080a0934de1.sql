CREATE TYPE public.etape_workflow AS ENUM ('positionnement','financement','realisation','finalisation');

CREATE TABLE public.dossiers_apprenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formateur_id uuid NOT NULL,
  apprenant_id uuid NOT NULL REFERENCES public.apprenants(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  jeton text NOT NULL UNIQUE,
  etape public.etape_workflow NOT NULL DEFAULT 'positionnement',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, formation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dossiers_apprenant TO authenticated;
GRANT ALL ON public.dossiers_apprenant TO service_role;
ALTER TABLE public.dossiers_apprenant ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dossiers visibles par proprietaire ou admin" ON public.dossiers_apprenant FOR SELECT TO authenticated USING ((auth.uid() = formateur_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Dossiers crees par le formateur" ON public.dossiers_apprenant FOR INSERT TO authenticated WITH CHECK (auth.uid() = formateur_id);
CREATE POLICY "Dossiers modifies par le formateur" ON public.dossiers_apprenant FOR UPDATE TO authenticated USING (auth.uid() = formateur_id) WITH CHECK (auth.uid() = formateur_id);
CREATE POLICY "Dossiers supprimes par le formateur" ON public.dossiers_apprenant FOR DELETE TO authenticated USING (auth.uid() = formateur_id);
CREATE TRIGGER maj_dossiers_apprenant BEFORE UPDATE ON public.dossiers_apprenant FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.documents_dossier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers_apprenant(id) ON DELETE CASCADE,
  formateur_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'autre',
  nom text NOT NULL,
  chemin text NOT NULL,
  taille bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents_dossier TO authenticated;
GRANT ALL ON public.documents_dossier TO service_role;
ALTER TABLE public.documents_dossier ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Documents dossier visibles par proprietaire ou admin" ON public.documents_dossier FOR SELECT TO authenticated USING ((auth.uid() = formateur_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Documents dossier geres par le formateur" ON public.documents_dossier FOR ALL TO authenticated USING (auth.uid() = formateur_id) WITH CHECK (auth.uid() = formateur_id);

CREATE TABLE public.reponses_recueil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL UNIQUE REFERENCES public.dossiers_apprenant(id) ON DELETE CASCADE,
  formateur_id uuid NOT NULL,
  reponses jsonb NOT NULL DEFAULT '{}'::jsonb,
  soumis_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reponses_recueil TO authenticated;
GRANT ALL ON public.reponses_recueil TO service_role;
ALTER TABLE public.reponses_recueil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recueil visible par proprietaire ou admin" ON public.reponses_recueil FOR SELECT TO authenticated USING ((auth.uid() = formateur_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Recueil gere par le formateur" ON public.reponses_recueil FOR ALL TO authenticated USING (auth.uid() = formateur_id) WITH CHECK (auth.uid() = formateur_id);
CREATE TRIGGER maj_reponses_recueil BEFORE UPDATE ON public.reponses_recueil FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();