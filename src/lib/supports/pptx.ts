import type { SlideSupport } from "@/lib/supports.functions";

const BLEU = "1D2C76";
const OR = "FDE005";
const TEXTE = "1A1A1A";

export interface DeckSupport {
  titreParcours: string;
  numeroModule: number;
  titreModule: string;
  partie: "theorie" | "exercices";
  slides: SlideSupport[];
}

export function libellePartie(partie: DeckSupport["partie"]) {
  return partie === "theorie" ? "Théorie" : "Exercices";
}

/**
 * Nomenclature imposée : parcours de formation, titre du parcours,
 * numéro du module et thème du module, puis la partie concernée.
 */
export function nomSupport(deck: DeckSupport) {
  return `Parcours de formation - ${deck.titreParcours} - Module ${deck.numeroModule} - ${deck.titreModule} - ${libellePartie(deck.partie)}`;
}

/** Construit le PowerPoint du module (charte Formatrix). */
export async function construirePptx(deck: DeckSupport): Promise<Blob> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Formatrix";
  pptx.company = "Formatrix";
  pptx.title = nomSupport(deck);

  const couverture = pptx.addSlide();
  couverture.background = { color: BLEU };
  couverture.addText(deck.titreParcours, {
    x: 0.6,
    y: 1.6,
    w: 8.8,
    h: 1,
    fontFace: "Carlito",
    fontSize: 30,
    bold: true,
    color: "FFFFFF",
  });
  couverture.addText(`Module ${deck.numeroModule} — ${deck.titreModule}`, {
    x: 0.6,
    y: 2.6,
    w: 8.8,
    h: 0.7,
    fontFace: "Carlito",
    fontSize: 20,
    color: "FFFFFF",
  });
  couverture.addText(libellePartie(deck.partie), {
    x: 0.6,
    y: 3.3,
    w: 8.8,
    h: 0.5,
    fontFace: "Carlito",
    fontSize: 16,
    color: OR,
  });
  couverture.addText("Formatrix", {
    x: 0.6,
    y: 4.7,
    w: 4,
    h: 0.4,
    fontFace: "Carlito",
    fontSize: 12,
    color: "FFFFFF",
  });

  deck.slides.forEach((slide, index) => {
    const s = pptx.addSlide();
    s.addShape("rect", {
      x: 0,
      y: 0,
      w: "100%",
      h: 0.12,
      fill: { color: BLEU },
    });
    s.addText(`${index + 1}. ${slide.titre}`, {
      x: 0.5,
      y: 0.35,
      w: 9,
      h: 0.7,
      fontFace: "Carlito",
      fontSize: 22,
      bold: true,
      color: BLEU,
    });

    const aPoints = slide.puces.length > 0;
    s.addText(slide.developpement, {
      x: 0.55,
      y: 1.15,
      w: aPoints ? 5.9 : 8.9,
      h: 3.7,
      fontFace: "Carlito",
      fontSize: 12,
      color: TEXTE,
      valign: "top",
      lineSpacingMultiple: 1.25,
      shrinkText: true,
    });

    if (aPoints) {
      s.addShape("roundRect", {
        x: 6.6,
        y: 1.15,
        w: 2.85,
        h: 3.7,
        fill: { color: "F2F4FA" },
        line: { color: BLEU, width: 1 },
      });
      s.addText("Points clés", {
        x: 6.8,
        y: 1.3,
        w: 2.5,
        h: 0.35,
        fontFace: "Carlito",
        fontSize: 13,
        bold: true,
        color: BLEU,
      });
      s.addText(
        slide.puces.map((puce) => ({ text: puce, options: { bullet: true } })),
        {
          x: 6.8,
          y: 1.7,
          w: 2.5,
          h: 3,
          fontFace: "Carlito",
          fontSize: 10.5,
          color: TEXTE,
          valign: "top",
          lineSpacingMultiple: 1.2,
          shrinkText: true,
        },
      );
    }

    s.addText(`${nomSupport(deck)} — diapositive ${index + 1}/${deck.slides.length}`, {
      x: 0.5,
      y: 5.1,
      w: 9,
      h: 0.3,
      fontFace: "Carlito",
      fontSize: 9,
      color: "666666",
    });
    if (slide.commentaire) s.addNotes(slide.commentaire);
  });

  const donnees = (await pptx.write({ outputType: "blob" })) as Blob;
  return donnees;
}
