import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Eye, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { PhotoProfil } from "@/components/PhotoProfil";
import { signalerPhotoProfilMiseAJour } from "@/hooks/usePhotoProfil";
import { nomFichierSur } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/intranet/profil")({
  component: Profil,
});

const TYPES_PIECES = [
  { valeur: "cv", label: "CV" },
  { valeur: "diplome", label: "Diplôme" },
  { valeur: "identite", label: "Carte d'identité" },
  { valeur: "casier", label: "Extrait de casier judiciaire" },
  { valeur: "autre", label: "Autres pièces" },
] as const;

type TypePiece = (typeof TYPES_PIECES)[number]["valeur"];

interface Piece {
  id: string;
  type: TypePiece;
  nom_fichier: string;
  chemin: string;
}

function Profil() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [statut, setStatut] = useState<string>("en_attente");
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    adresse: "",
    numero_declaration_activite: "",
    siret: "",
  });
  const [consentement, setConsentement] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState<TypePiece | null>(null);
  const [photoEnCours, setPhotoEnCours] = useState(false);

  const deposerPhoto = async (fichier: File) => {
    const { data: utilisateur } = await supabase.auth.getUser();
    const user = utilisateur.user;
    if (!user) return;
    setPhotoEnCours(true);
    setErreur(null);
    const chemin = `${user.id}/photo-${Date.now()}-${nomFichierSur(fichier.name)}`;
    const { error: erreurUpload } = await supabase.storage
      .from("avatars")
      .upload(chemin, fichier, { upsert: true });
    if (erreurUpload) {
      setErreur("L'envoi de la photo a échoué : " + erreurUpload.message);
      setPhotoEnCours(false);
      return;
    }
    const { error } = await supabase
      .from("profils_formateurs")
      .update({ photo_url: chemin })
      .eq("user_id", user.id);
    if (error) setErreur("L'envoi de la photo a échoué : " + error.message);
    else signalerPhotoProfilMiseAJour();
    setPhotoEnCours(false);
  };

  const charger = async () => {
    const { data: utilisateur } = await supabase.auth.getUser();
    const user = utilisateur.user;
    if (!user) return;
    setUserId(user.id);
    setEmail(user.email ?? "");

    const { data: profil } = await supabase
      .from("profils_formateurs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profil) {
      setForm({
        nom: profil.nom ?? "",
        prenom: profil.prenom ?? "",
        telephone: profil.telephone ?? "",
        adresse: profil.adresse ?? "",
        numero_declaration_activite: profil.numero_declaration_activite ?? "",
        siret: profil.siret ?? "",
      });
      setConsentement(!!profil.consentement);
      setStatut(profil.statut ?? "en_attente");
    }

    const { data: piecesData } = await supabase
      .from("pieces_formateur")
      .select("id, type, nom_fichier, chemin")
      .eq("formateur_id", user.id)
      .order("created_at", { ascending: false });
    setPieces((piecesData ?? []) as Piece[]);
    setChargement(false);
  };

  useEffect(() => {
    void charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enregistrer = async () => {
    if (!userId) return;
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    const { error } = await supabase.from("profils_formateurs").upsert({
      user_id: userId,
      email,
      ...form,
      consentement: true,
      consentement_at: new Date().toISOString(),
    });
    if (error) setErreur("L'enregistrement a échoué : " + error.message);
    else setMessage("Vos informations ont été enregistrées.");
    setEnregistrement(false);
  };

  const deposer = async (type: TypePiece, fichier: File) => {
    if (!userId) return;
    setEnvoiEnCours(type);
    setErreur(null);
    const chemin = `${userId}/${type}/${Date.now()}-${nomFichierSur(fichier.name)}`;
    const { error: erreurUpload } = await supabase.storage
      .from("pieces")
      .upload(chemin, fichier);
    if (erreurUpload) {
      setErreur("Le dépôt a échoué : " + erreurUpload.message);
      setEnvoiEnCours(null);
      return;
    }
    const { error } = await supabase.from("pieces_formateur").insert({
      formateur_id: userId,
      type,
      nom_fichier: fichier.name,
      chemin,
    });
    if (error) setErreur("Le dépôt a échoué : " + error.message);
    await charger();
    setEnvoiEnCours(null);
  };

  const consulterPiece = async (piece: Piece) => {
    const { data, error } = await supabase.storage
      .from("pieces")
      .createSignedUrl(piece.chemin, 300);
    if (error || !data?.signedUrl) {
      setErreur("Impossible d'ouvrir ce document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noreferrer");
  };

  const supprimerPiece = async (piece: Piece) => {
    await supabase.storage.from("pieces").remove([piece.chemin]);
    await supabase.from("pieces_formateur").delete().eq("id", piece.id);
    await charger();
  };

  if (chargement) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre
        profil…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Photo de profil</CardTitle>
          <CardDescription>
            Elle apparaît dans tout votre espace formateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <PhotoProfil className="h-20 w-20" />
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              className="max-w-xs"
              aria-label="Choisir une photo de profil"
              onChange={(e) => {
                const fichier = e.target.files?.[0];
                if (fichier) void deposerPhoto(fichier);
                e.target.value = "";
              }}
            />
            {photoEnCours ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Upload className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Coordonnées</CardTitle>
          <CardDescription>
            Statut de votre candidature :{" "}
            <span className="font-bold text-primary">
              {statut === "validee"
                ? "validée"
                : statut === "refusee"
                  ? "refusée"
                  : "en attente de validation"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email" className="text-sm font-bold text-primary">
              Adresse email
            </Label>
            <Input id="email" value={email} readOnly disabled />
          </div>
          {(
            [
              ["prenom", "Prénom"],
              ["nom", "Nom"],
              ["telephone", "Téléphone"],
              ["siret", "SIRET"],
              ["numero_declaration_activite", "Numéro de déclaration d'activité (NDA)"],
              ["adresse", "Adresse"],
            ] as const
          ).map(([cle, label]) => (
            <div key={cle} className="space-y-2">
              <Label htmlFor={cle} className="text-sm font-bold text-primary">
                {label}
              </Label>
              <Input
                id={cle}
                value={form[cle]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [cle]: e.target.value }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Pièces justificatives</CardTitle>
          <CardDescription>
            Déposez vos documents. Ils restent visibles uniquement par vous et
            par l'organisme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TYPES_PIECES.map((type) => {
            const fichiers = pieces.filter((p) => p.type === type.valeur);
            const recu = fichiers.length > 0;
            return (
              <div
                key={type.valeur}
                className="space-y-2 rounded-md border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-primary">{type.label}</p>
                  <span
                    className={
                      recu
                        ? "inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                        : "rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {recu ? (
                      <>
                        <Check className="h-3 w-3" /> Reçu
                      </>
                    ) : (
                      "À fournir"
                    )}
                  </span>
                </div>
                <ul className="space-y-1">
                  {fichiers.map((fichier) => (
                    <li
                      key={fichier.id}
                      className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <span className="truncate">{fichier.nom_fichier}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void consulterPiece(fichier)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Consulter
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Supprimer ${fichier.nom_fichier}`}
                          onClick={() => void supprimerPiece(fichier)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    className="max-w-xs"
                    aria-label={`Déposer : ${type.label}`}
                    onChange={(e) => {
                      const fichier = e.target.files?.[0];
                      if (fichier) void deposer(type.valeur, fichier);
                      e.target.value = "";
                    }}
                  />
                  {envoiEnCours === type.valeur ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Consentement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consentement"
              checked={consentement}
              onCheckedChange={(v) => setConsentement(v === true)}
            />
            <Label
              htmlFor="consentement"
              className="text-sm font-normal leading-relaxed"
            >
              J'accepte que mes données personnelles et les pièces déposées
              soient traitées par Back to Business dans le cadre de ma
              candidature, conformément à la{" "}
              <Link to="/politique-confidentialite" className="underline">
                politique de confidentialité
              </Link>
              .
            </Label>
          </div>
          {erreur && (
            <p className="text-xs font-medium text-destructive">{erreur}</p>
          )}
          {message && (
            <p className="text-xs font-medium text-primary">{message}</p>
          )}
          <Button
            type="button"
            disabled={!consentement || enregistrement}
            onClick={enregistrer}
          >
            {enregistrement && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
