-- Suppression de la demande de budget : seule la demande de formation subsiste.
DELETE FROM public.demandes_budget WHERE type_demande = 'budget';

ALTER TABLE public.demandes_budget RENAME TO demandes_formation;

ALTER TABLE public.demandes_formation
  DROP CONSTRAINT IF EXISTS demandes_budget_type_demande_check;

ALTER TABLE public.demandes_formation
  DROP COLUMN type_demande,
  DROP COLUMN budget_estime,
  DROP COLUMN nombre_heures,
  DROP COLUMN periode,
  DROP COLUMN commentaire;

ALTER TABLE public.demandes_formation
  RENAME CONSTRAINT demandes_budget_pkey TO demandes_formation_pkey;

ALTER TABLE public.demandes_formation
  RENAME CONSTRAINT demandes_budget_apprenant_id_fkey TO demandes_formation_apprenant_id_fkey;

ALTER TRIGGER maj_demandes_budget ON public.demandes_formation
  RENAME TO maj_demandes_formation;