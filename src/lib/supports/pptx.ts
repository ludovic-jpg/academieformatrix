import type { ModuleCours } from "@/lib/supports/cours";
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
  couverture.addText(
    `Module ${deck.numeroModule} — ${deck.titreModule}`,
    {
      x: 0.6,
      y: 2.6,
      w: 8.8,
      h: 0.7,
      fontFace: "Carlito",
      fontSize: 20,
      color: "FFFFFF",
    },
  );
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
      h: 0.1,
      fill: { color: BLEU },
    });
    s.addText(slide.titre, {
      x: 0.5,
      y: 0.4,
      w: 9,
      h: 0.8,
      fontFace: "Carlito",
      fontSize: 24,
      bold: true,
      color: BLEU,
    });
    s.addText(
      slide.puces.map((puce) => ({ text: puce, options: { bullet: true } })),
      {
        x: 0.7,
        y: 1.4,
        w: 8.6,
        h: 3.4,
        fontFace: "Carlito",
        fontSize: 16,
        color: TEXTE,
        lineSpacingMultiple: 1.2,
      },
    );
    s.addText(
      `${nomSupport(deck)} — diapositive ${index + 1}/${deck.slides.length}`,
      {
        x: 0.5,
        y: 5.1,
        w: 9,
        h: 0.3,
        fontFace: "Carlito",
        fontSize: 9,
        color: "666666",
      },
    );
    if (slide.commentaire) s.addNotes(slide.commentaire);
  });

  const donnees = (await pptx.write({ outputType: "blob" })) as Blob;
  return donnees;
}

/* ------------------------------------------------------------------ */
/* Support enrichi (recherche théorique approfondie)                    */
/* ------------------------------------------------------------------ */

/**
 * Construit un PowerPoint professionnel à partir d'un module approfondi :
 * la mise en page varie selon la nature de la diapositive (contenu,
 * points clés, schéma conceptuel, quiz de vérification).
 */
export async function construirePptxEnrichi(
  titreFormation: string,
  moduleCours: ModuleCours,
  numeroModule: number,
): Promise<Blob> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Formatrix";
  pptx.company = "Formatrix";
  pptx.title = `${titreFormation} — Module ${numeroModule} — ${moduleCours.title}`;

  const couverture = pptx.addSlide();
  couverture.background = { color: BLEU };
  couverture.addText(titreFormation, {
    x: 0.6, y: 1.5, w: 8.8, h: 1, fontFace: "Carlito", fontSize: 30,
    bold: true, color: "FFFFFF",
  });
  couverture.addText(`Module ${numeroModule} — ${moduleCours.title}`, {
    x: 0.6, y: 2.5, w: 8.8, h: 0.8, fontFace: "Carlito", fontSize: 20, color: OR,
  });
  couverture.addText("Support approfondi — Formatrix", {
    x: 0.6, y: 4.7, w: 6, h: 0.4, fontFace: "Carlito", fontSize: 12, color: "FFFFFF",
  });

  moduleCours.slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    s.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.12, fill: { color: BLEU } });
    s.addText(`${slide.slideNumber}. ${slide.title}`, {
      x: 0.5, y: 0.35, w: 9, h: 0.7, fontFace: "Carlito", fontSize: 22,
      bold: true, color: BLEU,
    });

    const aPointsCles = slide.keyTakeaways.length > 0;
    s.addText(slide.content, {
      x: 0.55,
      y: 1.15,
      w: aPointsCles ? 5.9 : 8.9,
      h: 3.7,
      fontFace: "Carlito",
      fontSize: 11,
      color: TEXTE,
      valign: "top",
      lineSpacingMultiple: 1.1,
      shrinkText: true,
    });

    if (aPointsCles) {
      s.addShape("roundRect", {
        x: 6.6, y: 1.15, w: 2.85, h: 3.7, fill: { color: "F2F4FA" },
        line: { color: BLEU, width: 1 },
      });
      s.addText("À retenir", {
        x: 6.8, y: 1.3, w: 2.5, h: 0.35, fontFace: "Carlito", fontSize: 13,
        bold: true, color: BLEU,
      });
      s.addText(
        slide.keyTakeaways.map((k) => ({ text: k, options: { bullet: true } })),
        {
          x: 6.8, y: 1.7, w: 2.5, h: 3, fontFace: "Carlito", fontSize: 10,
          color: TEXTE, valign: "top", shrinkText: true,
        },
      );
    }

    s.addText(
      `${titreFormation} — Module ${numeroModule} — diapositive ${i + 1}/${moduleCours.slides.length}`,
      { x: 0.5, y: 5.1, w: 9, h: 0.3, fontFace: "Carlito", fontSize: 9, color: "666666" },
    );
    if (slide.interactiveQuiz?.question) {
      s.addNotes(
        `Quiz : ${slide.interactiveQuiz.question}\n${slide.interactiveQuiz.options
          .map((o, k) => `${k === slide.interactiveQuiz.answerIndex ? "✔" : "-"} ${o}`)
          .join("\n")}`,
      );
    }
  });

  const quiz = pptx.addSlide();
  quiz.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.12, fill: { color: OR } });
  quiz.addText("Quiz de vérification des acquis", {
    x: 0.5, y: 0.4, w: 9, h: 0.7, fontFace: "Carlito", fontSize: 22, bold: true, color: BLEU,
  });
  quiz.addText(
    moduleCours.slides
      .filter((s) => s.interactiveQuiz?.question)
      .map((s, k) => ({
        text: `${k + 1}. ${s.interactiveQuiz.question}\n   ${s.interactiveQuiz.options.join("  |  ")}`,
        options: { breakLine: true },
      })),
    {
      x: 0.6, y: 1.2, w: 8.8, h: 3.7, fontFace: "Carlito", fontSize: 12,
      color: TEXTE, valign: "top", shrinkText: true,
    },
  );

  return (await pptx.write({ outputType: "blob" })) as Blob;
}
