CREATE TABLE public.supports_cours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formateur_id uuid NOT NULL,
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  numero_module integer NOT NULL CHECK (numero_module > 0),
  titre_module text NOT NULL,
  contenu jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (formation_id, numero_module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supports_cours TO authenticated;
GRANT ALL ON public.supports_cours TO service_role;
ALTER TABLE public.supports_cours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Supports cours visibles par proprietaire ou admin"
ON public.supports_cours FOR SELECT TO authenticated
USING ((auth.uid() = formateur_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Supports cours crees par proprietaire"
ON public.supports_cours FOR INSERT TO authenticated
WITH CHECK (auth.uid() = formateur_id);
CREATE POLICY "Supports cours modifies par proprietaire"
ON public.supports_cours FOR UPDATE TO authenticated
USING (auth.uid() = formateur_id)
WITH CHECK (auth.uid() = formateur_id);
CREATE POLICY "Supports cours supprimes par proprietaire"
ON public.supports_cours FOR DELETE TO authenticated
USING (auth.uid() = formateur_id);
CREATE TRIGGER maj_supports_cours
BEFORE UPDATE ON public.supports_cours
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX supports_cours_formation_idx ON public.supports_cours (formation_id, numero_module);

CREATE TABLE public.reponses_questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers_apprenant(id) ON DELETE CASCADE,
  questionnaire_id uuid NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  formateur_id uuid NOT NULL,
  reponses jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0),
  soumis_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dossier_id, questionnaire_id)
);
GRANT SELECT ON public.reponses_questionnaires TO authenticated;
GRANT ALL ON public.reponses_questionnaires TO service_role;
ALTER TABLE public.reponses_questionnaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reponses questionnaires visibles par proprietaire ou admin"
ON public.reponses_questionnaires FOR SELECT TO authenticated
USING ((auth.uid() = formateur_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER maj_reponses_questionnaires
BEFORE UPDATE ON public.reponses_questionnaires
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX reponses_questionnaires_dossier_idx ON public.reponses_questionnaires (dossier_id);
CREATE INDEX reponses_questionnaires_formateur_idx ON public.reponses_questionnaires (formateur_id, soumis_at DESC);