// Constantes fixes et définitives de l'organisme — ne jamais les redemander
// à l'utilisateur dans un formulaire.
export const ORGANISME = {
  nomAffiche: "Formatrix", // marque utilisée sur le logo et dans l'application
  raisonSociale: "Back to Business", // raison sociale légale, pied de page des documents
  adresse: "95 D rue principale, 68118 Hirtzbach",
  telephone: "06 60 11 62 15",
  email: "backtobusiness.eu@gmail.com",
  siret: "91843372300015",
  numeroDeclarationActivite: "44680333468",
  prefecture: "Grand Est",
  numeroCertificationQualite: "B02267", // certification RNQ par ICPF
} as const;
