import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { ORGANISME } from "@/config/organisme";
import type { SlideSupport } from "@/lib/supports.functions";

Font.register({
  family: "Carlito",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/carlito/v4/3Jn9SDPw3m-pk039PDA.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/carlito/v4/3Jn4SDPw3m-pk039BIykaX0.ttf",
      fontWeight: 700,
    },
  ],
});

const BLEU = "#1D2C76";
const OR = "#FDE005";
const TEXTE = "#1A1A1A";
const GRIS = "#666666";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Carlito",
    fontSize: 12,
    color: TEXTE,
    backgroundColor: "#FFFFFF",
    padding: 40,
  },
  couverture: {
    fontFamily: "Carlito",
    backgroundColor: BLEU,
    color: "#FFFFFF",
    padding: 60,
    justifyContent: "center",
  },
  titreParcours: { fontSize: 28, fontWeight: 700 },
  sousTitre: { fontSize: 18, marginTop: 12 },
  partie: { fontSize: 14, marginTop: 8, color: OR },
  barre: { height: 3, backgroundColor: BLEU, marginBottom: 16 },
  titreSlide: { fontSize: 20, fontWeight: 700, color: BLEU, marginBottom: 14 },
  developpement: { fontSize: 11, lineHeight: 1.5, marginBottom: 16 },
  encart: {
    marginTop: 4,
    padding: 12,
    backgroundColor: "#F2F4FA",
    borderWidth: 1,
    borderColor: BLEU,
  },
  encartTitre: { fontSize: 11, fontWeight: 700, color: BLEU, marginBottom: 8 },
  puce: { flexDirection: "row", marginBottom: 6 },
  point: { color: BLEU, marginRight: 6 },
  puceTexte: { flex: 1, lineHeight: 1.4, fontSize: 10 },
  commentaire: {
    marginTop: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DDDDDD",
    fontSize: 9,
    color: GRIS,
    lineHeight: 1.4,
  },
  pied: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: GRIS,
  },
});

export function SupportPdf({
  titreParcours,
  numeroModule,
  titreModule,
  partie,
  slides,
}: {
  titreParcours: string;
  numeroModule: number;
  titreModule: string;
  partie: string;
  slides: SlideSupport[];
}) {
  const nom = `Parcours de formation - ${titreParcours} - Module ${numeroModule} - ${titreModule} - ${partie}`;
  return (
    <Document title={nom} author={ORGANISME.raisonSociale}>
      <Page size="A4" orientation="landscape" style={styles.couverture}>
        <Text style={styles.titreParcours}>{titreParcours}</Text>
        <Text style={styles.sousTitre}>
          Module {numeroModule} — {titreModule}
        </Text>
        <Text style={styles.partie}>{partie}</Text>
      </Page>
      {slides.map((slide, index) => (
        <Page key={index} size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.barre} />
          <Text style={styles.titreSlide}>{slide.titre}</Text>
          {slide.developpement ? (
            <Text style={styles.developpement}>{slide.developpement}</Text>
          ) : null}
          {slide.puces.length > 0 ? (
            <View style={styles.encart}>
              <Text style={styles.encartTitre}>Points clés</Text>
              {slide.puces.map((puce, j) => (
                <View key={j} style={styles.puce}>
                  <Text style={styles.point}>•</Text>
                  <Text style={styles.puceTexte}>{puce}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {slide.commentaire ? (
            <Text style={styles.commentaire}>Note d'animation : {slide.commentaire}</Text>
          ) : null}
          <View style={styles.pied} fixed>
            <Text>{ORGANISME.raisonSociale}</Text>
            <Text>
              {index + 1} / {slides.length}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
