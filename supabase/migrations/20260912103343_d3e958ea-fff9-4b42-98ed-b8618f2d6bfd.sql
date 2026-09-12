
CREATE TYPE public.app_role AS ENUM ('admin', 'formateur');
CREATE TYPE public.statut_candidature AS ENUM ('en_attente', 'validee', 'refusee');
CREATE TYPE public.type_piece AS ENUM ('cv', 'diplome', 'identite', 'casier', 'autre');
CREATE TYPE public.type_questionnaire AS ENUM ('positionnement', 'acquis');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Lecture de ses propres roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profils formateurs
CREATE TABLE public.profils_formateurs (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  nom text NOT NULL DEFAULT '',
  prenom text NOT NULL DEFAULT '',
  telephone text NOT NULL DEFAULT '',
  adresse text NOT NULL DEFAULT '',
  numero_declaration_activite text NOT NULL DEFAULT '',
  siret text NOT NULL DEFAULT '',
  consentement boolean NOT NULL DEFAULT false,
  consentement_at timestamptz,
  statut public.statut_candidature NOT NULL DEFAULT 'en_attente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profils_formateurs TO authenticated;
GRANT ALL ON public.profils_formateurs TO service_role;
ALTER TABLE public.profils_formateurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Formateur voit son profil" ON public.profils_formateurs
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Formateur cree son profil" ON public.profils_formateurs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Formateur modifie son profil" ON public.profils_formateurs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER maj_profils_formateurs BEFORE UPDATE ON public.profils_formateurs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pieces justificatives
CREATE TABLE public.pieces_formateur (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formateur_id uuid NOT NULL,
  type public.type_piece NOT NULL,
  nom_fichier text NOT NULL,
  chemin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pieces_formateur ON public.pieces_formateur (formateur_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pieces_formateur TO authenticated;
GRANT ALL ON public.pieces_formateur TO service_role;
ALTER TABLE public.pieces_formateur ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pieces visibles par proprietaire ou admin" ON public.pieces_formateur
  FOR SELECT TO authenticated USING (auth.uid() = formateur_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Pieces ajoutees par proprietaire" ON public.pieces_formateur
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = formateur_id);
CREATE POLICY "Pieces supprimees par proprietaire" ON public.pieces_formateur
  FOR DELETE TO authenticated USING (auth.uid() = formateur_id);

-- Formations enregistrees
CREATE TABLE public.formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formateur_id uuid NOT NULL,
  titre text NOT NULL,
  niveau text NOT NULL DEFAULT '',
  duree_heures numeric NOT NULL DEFAULT 0,
  programme jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_formations_formateur ON public.formations (formateur_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formations TO authenticated;
GRANT ALL ON public.formations TO service_role;
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Formations du formateur" ON public.formations
  FOR ALL TO authenticated USING (auth.uid() = formateur_id) WITH CHECK (auth.uid() = formateur_id);
CREATE TRIGGER maj_formations BEFORE UPDATE ON public.formations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Questionnaires (positionnement / acquis)
CREATE TABLE public.questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formateur_id uuid NOT NULL,
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  type public.type_questionnaire NOT NULL,
  titre text NOT NULL DEFAULT '',
  questions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_questionnaires_formateur ON public.questionnaires (formateur_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaires TO authenticated;
GRANT ALL ON public.questionnaires TO service_role;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questionnaires du formateur" ON public.questionnaires
  FOR ALL TO authenticated USING (auth.uid() = formateur_id) WITH CHECK (auth.uid() = formateur_id);
CREATE TRIGGER maj_questionnaires BEFORE UPDATE ON public.questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coffre-fort pedagogique
CREATE TABLE public.coffre_fichiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formateur_id uuid NOT NULL,
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  nom text NOT NULL,
  chemin text NOT NULL,
  taille bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coffre_formation ON public.coffre_fichiers (formation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coffre_fichiers TO authenticated;
GRANT ALL ON public.coffre_fichiers TO service_role;
ALTER TABLE public.coffre_fichiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coffre du formateur" ON public.coffre_fichiers
  FOR ALL TO authenticated USING (auth.uid() = formateur_id) WITH CHECK (auth.uid() = formateur_id);

CREATE TABLE public.partages_coffre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formateur_id uuid NOT NULL,
  formation_id uuid NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  jeton text NOT NULL UNIQUE,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_partages_formation ON public.partages_coffre (formation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partages_coffre TO authenticated;
GRANT ALL ON public.partages_coffre TO service_role;
ALTER TABLE public.partages_coffre ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partages du formateur" ON public.partages_coffre
  FOR ALL TO authenticated USING (auth.uid() = formateur_id) WITH CHECK (auth.uid() = formateur_id);

-- Attribution automatique du role formateur et du role admin de Formatrix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profils_formateurs (user_id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'formateur')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF lower(COALESCE(NEW.email, '')) = 'ludovic@formatrix.fr' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
