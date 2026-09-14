/**
 * Construit une page HTML autonome pour prévisualiser un paquet SCORM 1.2
 * généré par construireScorm : les scripts externes (scorm.js, cours.js)
 * sont inlinés dans index.html, ce qui permet de l'afficher dans un iframe
 * via une simple URL de blob, sans dépendre d'un vrai LMS (l'API SCORM du
 * paquet gère déjà gracieusement son absence).
 */
export async function construireApercuScorm(paquet: Blob): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(paquet);
  const indexFile = zip.file("index.html");
  const scormFile = zip.file("scorm.js");
  const coursFile = zip.file("cours.js");
  if (!indexFile || !scormFile || !coursFile) {
    throw new Error("Ce paquet SCORM n'est pas dans un format prévisualisable.");
  }
  const [html, scormJs, coursJs] = await Promise.all([
    indexFile.async("text"),
    scormFile.async("text"),
    coursFile.async("text"),
  ]);
  return html
    .replace('<script src="scorm.js"></script>', `<script>${scormJs}</script>`)
    .replace('<script src="cours.js"></script>', `<script>${coursJs}</script>`);
}
