import type { DeckSupport } from "@/lib/supports/pptx";
import { libellePartie } from "@/lib/supports/pptx";

/** Construit le PDF du support (une diapositive par page, format paysage). */
export async function construireSupportPdf(deck: DeckSupport): Promise<Blob> {
  const { Buffer } = await import("buffer");
  const global = globalThis as unknown as { Buffer?: unknown };
  if (!global.Buffer) global.Buffer = Buffer;
  const [{ pdf }, { SupportPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/SupportPdf"),
  ]);
  return await pdf(
    <SupportPdf
      titreParcours={deck.titreParcours}
      numeroModule={deck.numeroModule}
      titreModule={deck.titreModule}
      partie={libellePartie(deck.partie)}
      slides={deck.slides}
    />,
  ).toBlob();
}
