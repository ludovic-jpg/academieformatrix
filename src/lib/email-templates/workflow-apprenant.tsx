import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

interface Props {
  apprenantPrenom?: string
  titreFormation?: string
  titreEtape?: string
  message?: string
  lien?: string
  formateur?: string
}

const Email = ({
  apprenantPrenom,
  titreFormation,
  titreEtape,
  message,
  lien,
  formateur,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{titreEtape ?? 'Votre parcours de formation'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>{titreEtape ?? 'Votre parcours de formation'}</Heading>
        <Text style={texte}>
          {apprenantPrenom ? `Bonjour ${apprenantPrenom},` : 'Bonjour,'}
        </Text>
        {titreFormation ? (
          <Text style={texte}>Formation : {titreFormation}</Text>
        ) : null}
        {message ? <Text style={texte}>{message}</Text> : null}
        {lien ? (
          <Section style={{ margin: '24px 0' }}>
            <Button href={lien} style={bouton}>
              Accéder à mon espace de formation
            </Button>
          </Section>
        ) : null}
        <Text style={texte}>
          Vous y retrouverez vos documents à télécharger, à remplir en ligne et à
          renvoyer signés.
        </Text>
        <Text style={signature}>
          {formateur ? `${formateur} — ` : ''}Formatrix
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `${data['titreEtape'] ?? 'Votre parcours de formation'} — Formatrix`,
  displayName: 'Parcours apprenant',
  previewData: {
    apprenantPrenom: 'Marie',
    titreFormation: 'Bureautique niveau 1',
    titreEtape: 'Positionnement sur votre parcours de formation',
    message:
      'Merci de compléter le recueil des besoins et le test de positionnement.',
    lien: 'https://academieformatrix.lovable.app/dossier/exemple',
    formateur: 'Ludovic Albisser',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const heading = { color: '#1D2C76', fontSize: '20px' }
const texte = { color: '#1A1A1A', fontSize: '14px', lineHeight: '22px' }
const signature = { color: '#444444', fontSize: '13px', marginTop: '24px' }
const bouton = {
  backgroundColor: '#1D2C76',
  color: '#ffffff',
  padding: '12px 20px',
  borderRadius: '6px',
  fontSize: '14px',
  textDecoration: 'none',
}
