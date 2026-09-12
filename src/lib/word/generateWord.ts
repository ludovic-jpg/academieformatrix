import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
  UnderlineType,
} from "docx";
import { saveAs } from "file-saver";

import { ORGANISME } from "@/config/organisme";
import {
  PHRASE_METHODES_PEDAGOGIQUES,
  VALEURS_DEFAUT,
  type ProgrammeFormation,
} from "@/config/programme";

const BLEU = "1D2C76";
const TEXTE = "1A1A1A";
const GRIS = "444444";

const BORDURE = { style: BorderStyle.SINGLE, size: 6, color: BLEU, space: 6 };

// A4 en DXA (1440 dxa = 1 pouce) et marges d'environ 2 cm.
const PAGE_LARGEUR = 11906;
const MARGE = 1134;
const LARGEUR_UTILE = PAGE_LARGEUR - MARGE * 2;

/** Récupère le logo pour l'insérer dans l'en-tête Word. */
async function chargerLogo(): Promise<ArrayBuffer | null> {
  try {
    const reponse = await fetch(`${window.location.origin}/logo.png`);
    if (!reponse.ok) return null;
    return await reponse.arrayBuffer();
  } catch {
    return null;
  }
}

function paragrapheTexte(texte: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 60 },
    children: [new TextRun({ text: texte, color: TEXTE })],
  });
}

function titreSection(texte: string): Paragraph {
  return new Paragraph({
    spacing: { before: 180, after: 60 },
    children: [
      new TextRun({ text: texte, bold: true, color: BLEU, size: 22 }),
    ],
  });
}

function puces(items: string[]): Paragraph[] {
  return items
    .filter((i) => i.trim().length > 0)
    .map(
      (item) =>
        new Paragraph({
          numbering: { reference: "puces", level: 0 },
          spacing: { after: 20 },
          children: [new TextRun({ text: item, color: TEXTE })],
        }),
    );
}

function ligneInfo(libelle: string, valeur: string): Paragraph {
  return new Paragraph({
    spacing: { after: 20 },
    children: [
      new TextRun({ text: `${libelle} `, bold: true, color: BLEU }),
      new TextRun({ text: valeur, color: TEXTE }),
    ],
  });
}

function section(titre: string, contenu: Paragraph[]): Paragraph[] {
  return [titreSection(titre), ...contenu];
}

function construireEntete(
  programme: ProgrammeFormation,
  logo: ArrayBuffer | null,
): Header {
  const enfants: Paragraph[] = [];

  if (logo) {
    enfants.push(
      new Paragraph({
        spacing: { after: 60 },
        // La bordure droite reproduit la barre verticale bleu marine
        // placée juste après le logo.
        indent: { right: LARGEUR_UTILE - 3200 },
        border: { right: { ...BORDURE, style: BorderStyle.SINGLE, size: 12 } },
        children: [
          new ImageRun({
            type: "png",
            data: logo,
            transformation: { width: 200, height: 31 },
            altText: {
              title: "Formatrix",
              description: "Logo Formatrix",
              name: "logo",
            },
          }),
        ],
      }),
    );
  }

  // Encadré du titre : bordures réparties sur les paragraphes du bloc.
  const lignes: {
    texte: string;
    style: Partial<{ bold: boolean; size: number; caps: boolean }>;
  }[] = [
    { texte: programme.titre.toUpperCase(), style: { bold: true, size: 26 } },
  ];
  lignes.push({ texte: "Programme Détaillé", style: { bold: true, size: 20 } });

  lignes.forEach((ligne, index) => {
    const premier = index === 0;
    const dernier = index === lignes.length - 1;
    enfants.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: 900, right: 900 },
        spacing: { before: premier ? 80 : 0, after: dernier ? 80 : 0 },
        border: {
          left: BORDURE,
          right: BORDURE,
          ...(premier ? { top: BORDURE } : {}),
          ...(dernier ? { bottom: BORDURE } : {}),
        },
        children: [
          new TextRun({ text: ligne.texte, color: BLEU, ...ligne.style }),
        ],
      }),
    );
  });

  return new Header({ children: enfants });
}

function construirePied(): Footer {
  const ligne = (texte: string) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: texte, color: GRIS, size: 16 })],
    });

  return new Footer({
    children: [
      ligne(`${ORGANISME.raisonSociale} ${ORGANISME.adresse}`),
      ligne(`${ORGANISME.telephone} – ${ORGANISME.email}`),
      ligne(
        `N° SIRET : ${ORGANISME.siret} – DNA : ${ORGANISME.numeroDeclarationActivite} Auprès du préfet de la région ${ORGANISME.prefecture}`,
      ),
      ligne(
        `ORGANISME CERTIFIE RNQ par ICPF sous le N°${ORGANISME.numeroCertificationQualite}`,
      ),
    ],
  });
}

function construireCorps(programme: ProgrammeFormation): Paragraph[] {
  const modules = programme.modules.filter(
    (m) => m.titre.trim().length > 0 || m.points.length > 0,
  );

  const contenu: Paragraph[] = [
    ...section("Informations générales", [
      ligneInfo("Mode de formation :", programme.modeFormation),
      ...(programme.plateforme
        ? [ligneInfo("Plateforme :", programme.plateforme)]
        : []),
      ligneInfo("Durée :", `${programme.dureeHeures} heures`),
      ligneInfo(
        "Nombre de modules :",
        String(modules.length || programme.nombreModules),
      ),
    ]),
    ...section("Public concerné", [paragrapheTexte(programme.publicConcerne)]),
    ...section("Prérequis", [paragrapheTexte(programme.prerequis)]),
    ...section("Niveau", [paragrapheTexte(programme.niveau)]),
    ...section("Objectifs pédagogiques", puces(programme.objectifsPedagogiques)),
    ...section("Modalités d'accès", [paragrapheTexte(programme.modalitesAcces)]),
    ...section("Encadrement", [paragrapheTexte(programme.encadrement)]),
    ...section(
      "Accompagnement pédagogique",
      puces(programme.accompagnementPedagogique),
    ),
    ...section("Suivi de la formation", [paragrapheTexte(programme.suivi)]),
    ...section("Modalités d'évaluation", puces(programme.modalitesEvaluation)),
    ...section("Validation de la formation", [
      paragrapheTexte(programme.validationFormation),
    ]),
    ...section("Méthodes pédagogiques", [
      paragrapheTexte(PHRASE_METHODES_PEDAGOGIQUES),
      ...puces(programme.methodesPedagogiques),
    ]),
    ...section(
      "Moyens pédagogiques spécifiques",
      puces(programme.moyensPedagogiques),
    ),
    ...section("Accessibilité aux personnes en situation de handicap", [
      paragrapheTexte(VALEURS_DEFAUT.accessibiliteHandicap),
    ]),
  ];

  if (modules.length > 0) {
    contenu.push(new Paragraph({ children: [new PageBreak()] }));
    contenu.push(titreSection("Contenu détaillé de la formation"));
    modules.forEach((module, index) => {
      contenu.push(
        new Paragraph({
          spacing: { before: 200, after: 60 },
          keepNext: true,
          children: [
            new TextRun({
              text: `Module ${index + 1} — ${module.titre}`,
              bold: true,
              color: BLEU,
              size: 24,
              underline: { type: UnderlineType.SINGLE, color: BLEU },
            }),
          ],
        }),
      );
      contenu.push(...puces(module.points));
    });
  }

  return contenu;
}

/** Génère le .docx du programme et déclenche son téléchargement. */
export async function genererWord(
  programme: ProgrammeFormation,
): Promise<void> {
  const logo = await chargerLogo();

  const document = new Document({
    title: `Programme de formation — ${programme.titre}`,
    creator: ORGANISME.raisonSociale,
    styles: {
      default: {
        document: { run: { font: "Carlito", size: 20, color: TEXTE } },
      },
    },
    numbering: {
      config: [
        {
          reference: "puces",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 400, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_LARGEUR, height: 16838 },
            margin: {
              top: 2100,
              right: MARGE,
              bottom: 1600,
              left: MARGE,
              header: 567,
              footer: 567,
            },
          },
        },
        headers: { default: construireEntete(programme, logo) },
        footers: { default: construirePied() },
        children: construireCorps(programme),
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, `Programme - ${programme.titre}.docx`);
}
