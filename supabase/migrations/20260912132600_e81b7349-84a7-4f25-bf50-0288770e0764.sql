CREATE TABLE public.apprenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formateur_id uuid NOT NULL,
  apprenant_nom text NOT NULL DEFAULT '',
  apprenant_prenom text NOT NULL DEFAULT '',
  apprenant_email text NOT NULL DEFAULT '',
  apprenant_telephone text NOT NULL DEFAULT '',
  entreprise_nom text NOT NULL DEFAULT '',
  entreprise_siret text NOT NULL DEFAULT '',
  entreprise_adresse text NOT NULL DEFAULT '',
  contact_nom text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apprenants TO authenticated;
GRANT ALL ON public.apprenants TO service_role;

ALTER TABLE public.apprenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apprenants crees par le formateur" ON public.apprenants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = formateur_id);
CREATE POLICY "Apprenants visibles par proprietaire ou admin" ON public.apprenants
  FOR SELECT TO authenticated USING (auth.uid() = formateur_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Apprenants modifies par proprietaire" ON public.apprenants
  FOR UPDATE TO authenticated USING (auth.uid() = formateur_id) WITH CHECK (auth.uid() = formateur_id);
CREATE POLICY "Apprenants supprimes par proprietaire" ON public.apprenants
  FOR DELETE TO authenticated USING (auth.uid() = formateur_id);

CREATE TRIGGER maj_apprenants BEFORE UPDATE ON public.apprenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.demandes_budget
  ADD COLUMN type_demande text NOT NULL DEFAULT 'budget',
  ADD COLUMN archivee boolean NOT NULL DEFAULT false,
  ADD COLUMN apprenant_id uuid REFERENCES public.apprenants(id) ON DELETE SET NULL;

ALTER TABLE public.demandes_budget
  ADD CONSTRAINT demandes_budget_type_demande_check CHECK (type_demande IN ('budget','formation'));