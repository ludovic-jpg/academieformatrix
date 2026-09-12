import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  formateurEmail?: string;
  apprenantPrenom?: string;
  apprenantNom?: string;
  apprenantEmail?: string;
  apprenantTelephone?: string;
  entrepriseNom?: string;
  entrepriseSiret?: string;
  entrepriseAdresse?: string;
  contactNom?: string;
  contactEmail?: string;
  formationSouhaitee?: string;
  periode?: string;
  nombreHeures?: number;
  budgetEstime?: number;
  commentaire?: string;
}

const Ligne = ({ label, valeur }: { label: string; valeur?: string }) =>
  valeur ? (
    <Text style={ligne}>
      <span style={cle}>{label} : </span>
      {valeur}
    </Text>
  ) : null;

const Email = (props: Props) => {
  const apprenant = [props.apprenantPrenom, props.apprenantNom]
    .filter(Boolean)
    .join(" ");
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        Nouvelle demande de budget — {props.formationSouhaitee ?? "formation"}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={barre} />
          <Heading style={titre}>Nouvelle demande de budget</Heading>
          <Text style={ligne}>
            Une demande de budget vient d'être déposée dans l'espace formateur
            {props.formateurEmail ? ` par ${props.formateurEmail}` : ""}.
          </Text>
          <Hr style={trait} />
          <Heading as="h2" style={sousTitre}>
            Apprenant
          </Heading>
          <Ligne label="Nom" valeur={apprenant} />
          <Ligne label="Email" valeur={props.apprenantEmail} />
          <Ligne label="Téléphone" valeur={props.apprenantTelephone} />
          <Hr style={trait} />
          <Heading as="h2" style={sousTitre}>
            Entreprise
          </Heading>
          <Ligne label="Raison sociale" valeur={props.entrepriseNom} />
          <Ligne label="SIRET" valeur={props.entrepriseSiret} />
          <Ligne label="Adresse" valeur={props.entrepriseAdresse} />
          <Ligne label="Contact" valeur={props.contactNom} />
          <Ligne label="Email du contact" valeur={props.contactEmail} />
          <Hr style={trait} />
          <Heading as="h2" style={sousTitre}>
            Formation
          </Heading>
          <Ligne label="Formation souhaitée" valeur={props.formationSouhaitee} />
          <Ligne label="Période envisagée" valeur={props.periode} />
          <Ligne
            label="Nombre d'heures"
            valeur={props.nombreHeures ? `${props.nombreHeures} h` : undefined}
          />
          <Ligne
            label="Budget estimé"
            valeur={props.budgetEstime ? `${props.budgetEstime} €` : undefined}
          />
          <Ligne label="Commentaire" valeur={props.commentaire} />
          <Hr style={trait} />
          <Text style={pied}>
            Cette demande est consultable et traitable dans l'espace
            Administration de l'Espace Formateur Formatrix.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Nouvelle demande de budget — ${data['formationSouhaitee'] ?? "formation"}`,
  displayName: "Demande de budget (administration)",
  to: "ludovic@formatrix.fr",
  previewData: {
    formateurEmail: "formateur@formatrix.fr",
    apprenantPrenom: "Marie",
    apprenantNom: "Durand",
    apprenantEmail: "marie.durand@exemple.fr",
    apprenantTelephone: "06 12 34 56 78",
    entrepriseNom: "Exemple SARL",
    entrepriseSiret: "12345678900012",
    entrepriseAdresse: "12 rue des Fleurs, 68100 Mulhouse",
    contactNom: "Paul Martin",
    contactEmail: "paul.martin@exemple.fr",
    formationSouhaitee: "Bureautique avancée",
    periode: "Janvier 2027",
    nombreHeures: 21,
    budgetEstime: 2400,
    commentaire: "Formation en présentiel souhaitée.",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Carlito, Calibri, Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "600px" };
const barre = {
  borderLeft: "4px solid #1D2C76",
  height: "28px",
  marginBottom: "12px",
};
const titre = { color: "#1D2C76", fontSize: "22px", margin: "0 0 12px" };
const sousTitre = { color: "#1D2C76", fontSize: "15px", margin: "16px 0 6px" };
const ligne = { color: "#1A1A1A", fontSize: "14px", margin: "4px 0" };
const cle = { fontWeight: 700 as const, color: "#1D2C76" };
const trait = { borderColor: "#e5e7eb", margin: "16px 0" };
const pied = { color: "#6b7280", fontSize: "12px", margin: "8px 0 0" };
