import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { ORGANISME } from "@/config/organisme";

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

const LOGO_SRC =
  typeof window !== "undefined"
    ? `${window.location.origin}/logo.png`
    : "/logo.png";

const BLEU = "#1D2C76";
const TEXTE = "#1A1A1A";
const GRIS = "#444444";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Carlito",
    fontSize: 10,
    color: TEXTE,
    backgroundColor: "#FFFFFF",
    paddingTop: 20 * 2.835,
    paddingBottom: 20 * 2.835 + 30,
    paddingHorizontal: 20 * 2.835,
    lineHeight: 1.4,
  },
  entete: { marginBottom: 12 },
  logoLigne: { flexDirection: "row", alignItems: "center" },
  logo: { height: 42, objectFit: "contain" },
  barre: { width: 2, height: 42, backgroundColor: BLEU, marginLeft: 10 },
  encadre: {
    marginTop: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: BLEU,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "center",
    maxWidth: "90%",
  },
  titre: {
    color: BLEU,
    fontWeight: 700,
    fontSize: 13,
    textAlign: "center",
    textTransform: "uppercase",
  },
  pied: {
    position: "absolute",
    bottom: 14 * 2.835,
    left: 20 * 2.835,
    right: 20 * 2.835,
    textAlign: "center",
    color: GRIS,
    fontSize: 8,
    lineHeight: 1.3,
  },
  identite: { marginBottom: 12 },
  ligneIdentite: { flexDirection: "row", marginBottom: 4 },
  libelle: { fontWeight: 700, color: BLEU, marginRight: 4 },
  trait: { flex: 1, borderBottomWidth: 1, borderBottomColor: GRIS },
  question: { marginBottom: 10 },
  intitule: { fontWeight: 700, color: BLEU, marginBottom: 3 },
  proposition: { flexDirection: "row", marginBottom: 2 },
  case: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: BLEU,
    marginRight: 6,
    marginTop: 2,
  },
  propositionTexte: { flex: 1 },
  bonne: { fontWeight: 700, color: BLEU },
});

export function QuestionnairePdf({
  titre,
  questions,
  avecCorrige,
}: {
  titre: string;
  questions: { question: string; propositions: string[]; bonneReponse: number }[];
  avecCorrige: boolean;
}) {
  return (
    <Document title={titre} author={ORGANISME.raisonSociale}>
      <Page size="A4" style={styles.page}>
        <View style={styles.entete} fixed>
          <View style={styles.logoLigne}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.logo} src={LOGO_SRC} />
            <View style={styles.barre} />
          </View>
          <View style={styles.encadre}>
            <Text style={styles.titre}>
              {titre}
              {avecCorrige ? " — corrigé" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.pied} fixed>
          <Text>
            {ORGANISME.raisonSociale} {ORGANISME.adresse}
          </Text>
          <Text>
            {ORGANISME.telephone} – {ORGANISME.email}
          </Text>
          <Text>
            N° SIRET : {ORGANISME.siret} – DNA :{" "}
            {ORGANISME.numeroDeclarationActivite} Auprès du préfet de la région{" "}
            {ORGANISME.prefecture}
          </Text>
          <Text>
            ORGANISME CERTIFIE RNQ par ICPF sous le N°
            {ORGANISME.numeroCertificationQualite}
          </Text>
        </View>

        {!avecCorrige ? (
          <View style={styles.identite}>
            <View style={styles.ligneIdentite}>
              <Text style={styles.libelle}>Nom et prénom :</Text>
              <View style={styles.trait} />
            </View>
            <View style={styles.ligneIdentite}>
              <Text style={styles.libelle}>Date :</Text>
              <View style={styles.trait} />
            </View>
          </View>
        ) : null}

        {questions.map((q, index) => (
          <View key={index} style={styles.question} wrap={false}>
            <Text style={styles.intitule}>
              {index + 1}. {q.question}
            </Text>
            {q.propositions.map((proposition, j) => (
              <View key={j} style={styles.proposition}>
                <View style={styles.case} />
                <Text
                  style={[
                    styles.propositionTexte,
                    ...(avecCorrige && j === q.bonneReponse
                      ? [styles.bonne]
                      : []),
                  ]}
                >
                  {proposition}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
