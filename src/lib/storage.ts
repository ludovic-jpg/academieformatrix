/**
 * Nettoie un nom de fichier pour en faire une clé de stockage valide :
 * accents supprimés, espaces et caractères spéciaux remplacés par « - ».
 * Sans cela, le dépôt échoue avec « Invalid key ».
 */
export function nomFichierSur(nom: string): string {
  const sansAccents = nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return sansAccents.length > 0 ? sansAccents.slice(-120) : "fichier";
}
