import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const EVENEMENT = "photo-profil-maj";

/** À appeler après un changement de photo pour rafraîchir l'affichage. */
export function signalerPhotoProfilMiseAJour() {
  window.dispatchEvent(new Event(EVENEMENT));
}

/** URL affichable de la photo de profil du formateur connecté. */
export function usePhotoProfil() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;

    const charger = async () => {
      const { data: utilisateur } = await supabase.auth.getUser();
      if (!utilisateur.user) return;
      const { data: profil } = await supabase
        .from("profils_formateurs")
        .select("photo_url")
        .eq("user_id", utilisateur.user.id)
        .maybeSingle();
      const chemin = (profil as { photo_url?: string } | null)?.photo_url;
      if (!chemin) {
        if (!annule) setUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(chemin, 3600);
      if (!annule) setUrl(data?.signedUrl ?? null);
    };

    void charger();
    const surMaj = () => void charger();
    window.addEventListener(EVENEMENT, surMaj);
    return () => {
      annule = true;
      window.removeEventListener(EVENEMENT, surMaj);
    };
  }, []);

  return url;
}
