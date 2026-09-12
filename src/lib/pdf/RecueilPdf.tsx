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
import {
  QUESTIONS_RECUEIL,
  TITRE_RECUEIL,
  type ReponsesRecueil,
} from "@/config/recueil";

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
  ligne: { flexDirection: "row", marginBottom: 4 },
  libelle: { fontWeight: 700, color: BLEU, marginRight: 4 },
  valeur: { flex: 1 },
  trait: { flex: 1, borderBottomWidth: 1, borderBottomColor: GRIS },
  question: { marginBottom: 12 },
  intitule: { fontWeight: 700, color: BLEU, marginBottom: 4 },
  reponse: {
    borderWidth: 1,
    borderColor: GRIS,
    borderStyle: "solid",
    minHeight: 42,
    padding: 6,
  },
  signature: { marginTop: 18 },
});

export interface InfosRecueil {
  nomStagiaire: string;
  titreFormation: string;
  dureeHeures: number | string;
  formateur: string;
  date: string;
}

export function RecueilPdf({
  infos,
  reponses,
}: {
  infos: InfosRecueil;
  reponses?: ReponsesRecueil;
}) {
  return (
    <Document title={TITRE_RECUEIL} author={ORGANISME.raisonSociale}>
      <Page size="A4" style={styles.page}>
        <View style={styles.entete} fixed>
          <View style={styles.logoLigne}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.logo} src={LOGO_SRC} />
            <View style={styles.barre} />
          </View>
          <View style={styles.encadre}>
            <Text style={styles.titre}>{TITRE_RECUEIL}</Text>
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

        <View style={styles.identite}>
          <View style={styles.ligne}>
            <Text style={styles.libelle}>Prénom et nom du stagiaire :</Text>
            <Text style={styles.valeur}>{infos.nomStagiaire}</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.libelle}>Intitulé de l'action :</Text>
            <Text style={styles.valeur}>{infos.titreFormation}</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.libelle}>Durée en heures :</Text>
            <Text style={styles.valeur}>{String(infos.dureeHeures)}</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.libelle}>Période souhaitée :</Text>
            <Text style={styles.valeur}>Voir planning</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.libelle}>Pré-évaluation effectuée le :</Text>
            <Text style={styles.valeur}>{infos.date}</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.libelle}>Par le formateur :</Text>
            <Text style={styles.valeur}>{infos.formateur}</Text>
          </View>
        </View>

        {QUESTIONS_RECUEIL.map((question) => (
          <View key={question.cle} style={styles.question} wrap={false}>
            <Text style={styles.intitule}>{question.intitule}</Text>
            <View style={styles.reponse}>
              <Text>{reponses?.[question.cle] ?? ""}</Text>
            </View>
          </View>
        ))}

        <View style={styles.signature} wrap={false}>
          <View style={styles.ligne}>
            <Text style={styles.libelle}>Date et signature du stagiaire :</Text>
            <View style={styles.trait} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
