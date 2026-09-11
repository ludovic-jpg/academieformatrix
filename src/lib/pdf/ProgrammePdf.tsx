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
  PHRASE_METHODES_PEDAGOGIQUES,
  VALEURS_DEFAUT,
  type ProgrammeFormation,
} from "@/config/programme";

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

// URL absolue : la librairie PDF n'accepte pas de chemin relatif.
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
  barre: {
    width: 2,
    height: 42,
    backgroundColor: BLEU,
    marginLeft: 10,
  },
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
  titreFormation: {
    color: BLEU,
    fontWeight: 700,
    fontSize: 13,
    textAlign: "center",
    textTransform: "uppercase",
  },
  sousTitreFormation: {
    color: BLEU,
    fontSize: 9,
    textAlign: "center",
    marginTop: 2,
  },
  programmeDetaille: {
    color: BLEU,
    fontWeight: 700,
    fontSize: 10,
    textAlign: "center",
    marginTop: 4,
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
  section: { marginBottom: 10 },
  titreSection: {
    color: BLEU,
    fontWeight: 700,
    fontSize: 11,
    marginBottom: 3,
  },
  paragraphe: { textAlign: "justify" },
  puce: { flexDirection: "row", marginBottom: 1 },
  puceMarque: { width: 10, color: BLEU },
  puceTexte: { flex: 1 },
  titreModule: {
    color: BLEU,
    fontWeight: 700,
    fontSize: 12,
    textDecoration: "underline",
    marginBottom: 4,
  },
  bloc: { marginBottom: 14 },
  ligneInfo: { flexDirection: "row", marginBottom: 1 },
  libelle: { fontWeight: 700, color: BLEU, marginRight: 4 },
});

function Entete({ programme }: { programme: ProgrammeFormation }) {
  return (
    <View style={styles.entete} fixed>
      <View style={styles.logoLigne}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={styles.logo} src="/logo.png" />
        <View style={styles.barre} />
      </View>
      <View style={styles.encadre}>
        <Text style={styles.titreFormation}>{programme.titre}</Text>
        {programme.sousTitre ? (
          <Text style={styles.sousTitreFormation}>{programme.sousTitre}</Text>
        ) : null}
        <Text style={styles.programmeDetaille}>Programme Détaillé</Text>
      </View>
    </View>
  );
}

function Pied() {
  return (
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
  );
}

function Puces({ items }: { items: string[] }) {
  return (
    <View>
      {items
        .filter((i) => i.trim().length > 0)
        .map((item, index) => (
          <View key={index} style={styles.puce}>
            <Text style={styles.puceMarque}>•</Text>
            <Text style={styles.puceTexte}>{item}</Text>
          </View>
        ))}
    </View>
  );
}

function Section({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.titreSection}>{titre}</Text>
      {children}
    </View>
  );
}

export function ProgrammePdf({
  programme,
}: {
  programme: ProgrammeFormation;
}) {
  const modules = programme.modules.filter(
    (m) => m.titre.trim().length > 0 || m.points.length > 0,
  );

  return (
    <Document
      title={`Programme de formation — ${programme.titre}`}
      author={ORGANISME.raisonSociale}
    >
      {/* Page 1 : sections dans l'ordre du formulaire */}
      <Page size="A4" style={styles.page}>
        <Entete programme={programme} />
        <Pied />

        <Section titre="Informations générales">
          <View style={styles.ligneInfo}>
            <Text style={styles.libelle}>Mode de formation :</Text>
            <Text>{programme.modeFormation}</Text>
          </View>
          {programme.plateforme ? (
            <View style={styles.ligneInfo}>
              <Text style={styles.libelle}>Plateforme :</Text>
              <Text>{programme.plateforme}</Text>
            </View>
          ) : null}
          <View style={styles.ligneInfo}>
            <Text style={styles.libelle}>Durée :</Text>
            <Text>{programme.dureeHeures} heures</Text>
          </View>
          <View style={styles.ligneInfo}>
            <Text style={styles.libelle}>Nombre de modules :</Text>
            <Text>{modules.length || programme.nombreModules}</Text>
          </View>
        </Section>

        <Section titre="Public concerné">
          <Text style={styles.paragraphe}>{programme.publicConcerne}</Text>
        </Section>

        <Section titre="Prérequis">
          <Text style={styles.paragraphe}>{programme.prerequis}</Text>
        </Section>

        <Section titre="Niveau">
          <Text>{programme.niveau}</Text>
        </Section>

        <Section titre="Objectifs pédagogiques">
          <Puces items={programme.objectifsPedagogiques} />
        </Section>

        <Section titre="Modalités d'accès">
          <Text style={styles.paragraphe}>{programme.modalitesAcces}</Text>
        </Section>

        <Section titre="Encadrement">
          <Text style={styles.paragraphe}>{programme.encadrement}</Text>
        </Section>

        <Section titre="Coordination pédagogique">
          <Text style={styles.paragraphe}>
            {programme.coordinationPedagogique}
          </Text>
        </Section>

        <Section titre="Accompagnement pédagogique">
          <Puces items={programme.accompagnementPedagogique} />
        </Section>

        <Section titre="Suivi de la formation">
          <Text style={styles.paragraphe}>{programme.suivi}</Text>
        </Section>

        <Section titre="Modalités d'évaluation">
          <Puces items={programme.modalitesEvaluation} />
        </Section>

        <Section titre="Validation de la formation">
          <Text style={styles.paragraphe}>{programme.validationFormation}</Text>
        </Section>

        <Section titre="Méthodes pédagogiques">
          <Text style={[styles.paragraphe, { marginBottom: 2 }]}>
            {PHRASE_METHODES_PEDAGOGIQUES}
          </Text>
          <Puces items={programme.methodesPedagogiques} />
        </Section>

        <Section titre="Moyens pédagogiques spécifiques">
          <Puces items={programme.moyensPedagogiques} />
        </Section>

        <Section titre="Accessibilité aux personnes en situation de handicap">
          <Text style={styles.paragraphe}>
            {VALEURS_DEFAUT.accessibiliteHandicap}
          </Text>
        </Section>
      </Page>

      {/* Pages suivantes : contenu détaillé des modules */}
      {modules.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Entete programme={programme} />
          <Pied />
          <Text style={[styles.titreSection, { marginBottom: 8 }]}>
            Contenu détaillé de la formation
          </Text>
          {modules.map((module, index) => (
            <View key={index} style={styles.bloc} wrap={false}>
              <Text style={styles.titreModule}>
                Module {index + 1} — {module.titre}
              </Text>
              <Puces items={module.points} />
            </View>
          ))}
        </Page>
      ) : null}
    </Document>
  );
}
