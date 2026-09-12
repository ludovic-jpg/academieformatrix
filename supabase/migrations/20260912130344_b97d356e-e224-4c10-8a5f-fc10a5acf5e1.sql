CREATE TYPE public.statut_demande AS ENUM ('nouvelle', 'en_cours', 'traitee');

CREATE TABLE public.demandes_budget (
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
  formation_souhaitee text NOT NULL DEFAULT '',
  periode text NOT NULL DEFAULT '',
  nombre_heures numeric NOT NULL DEFAULT 0,
  budget_estime numeric NOT NULL DEFAULT 0,
  commentaire text NOT NULL DEFAULT '',
  statut public.statut_demande NOT NULL DEFAULT 'nouvelle',
  reponse text NOT NULL DEFAULT '',
  repondu_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandes_budget TO authenticated;
GRANT ALL ON public.demandes_budget TO service_role;

ALTER TABLE public.demandes_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demandes visibles par proprietaire ou admin"
ON public.demandes_budget FOR SELECT TO authenticated
USING (auth.uid() = formateur_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Demandes creees par le formateur"
ON public.demandes_budget FOR INSERT TO authenticated
WITH CHECK (auth.uid() = formateur_id);

CREATE POLICY "Demandes modifiees par proprietaire ou admin"
ON public.demandes_budget FOR UPDATE TO authenticated
USING (auth.uid() = formateur_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = formateur_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Demandes supprimees par proprietaire ou admin"
ON public.demandes_budget FOR DELETE TO authenticated
USING (auth.uid() = formateur_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER maj_demandes_budget
BEFORE UPDATE ON public.demandes_budget
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();