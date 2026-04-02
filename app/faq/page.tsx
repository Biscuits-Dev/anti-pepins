'use client';

import React from 'react';
import { Section, CallToAction, FAQItem, SearchBar } from '@/components/ui';

interface FaqEntry {
  readonly question: string;
  readonly answer: React.ReactNode;
}

interface FaqCategory {
  readonly category: string;
  readonly items: readonly FaqEntry[];
}

const FAQ_DATA: readonly FaqCategory[] = [
  {
    category: 'Signalements',
    items: [
      {
        question: 'Comment signaler une arnaque ?',
        answer: (
          <>
            <p className="mb-2">
              Rendez-vous sur la page{' '}
              <a href="/report" className="text-blue-600 hover:underline">Signalement</a>{' '}
              et remplissez le formulaire avec&nbsp;:
            </p>
            <ul className="list-disc pl-6 mb-2">
              <li>Un titre descriptif</li>
              <li>Une description détaillée</li>
              <li>Des preuves (captures d&apos;écran, emails, etc.)</li>
            </ul>
            <p>Votre signalement sera traité sous 48h par notre équipe de modération.</p>
          </>
        ),
      },
      {
        question: 'Mes données sont-elles sécurisées ?',
        answer: (
          <>
            <p className="mb-2">Oui, nous respectons le RGPD et chiffrons toutes les données sensibles.</p>
            <p>
              Consultez notre{' '}
              <a href="/rgpd" className="text-blue-600 hover:underline">politique de confidentialité</a>{' '}
              pour plus d&apos;informations.
            </p>
          </>
        ),
      },
      {
        question: 'Puis-je signaler anonymement ?',
        answer: (
          <p>
            Oui, vous pouvez signaler sans créer de compte. Seules les informations
            nécessaires au traitement du signalement sont requises.
          </p>
        ),
      },
    ],
  },
  {
    category: 'Compte et Données',
    items: [
      {
        question: 'Comment créer un compte ?',
        answer: (
          <p>
            Cliquez sur &quot;Connexion&quot; en haut à droite, puis sur &quot;S&apos;inscrire&quot;.
            Vous pouvez utiliser votre email ou un compte Google/GitHub.
          </p>
        ),
      },
      {
        question: "J'ai oublié mon mot de passe",
        answer: (
          <p>
            Utilisez le lien &quot;Mot de passe oublié&quot; sur la page de connexion. Un email
            vous sera envoyé pour réinitialiser votre mot de passe.
          </p>
        ),
      },
      {
        question: 'Comment supprimer mon compte ?',
        answer: (
          <>
            <p className="mb-2">Vous pouvez supprimer votre compte dans les paramètres de votre profil.</p>
            <p>Toutes vos données personnelles seront effacées conformément au RGPD.</p>
          </>
        ),
      },
    ],
  },
  {
    category: 'Contribution',
    items: [
      {
        question: 'Comment aider sans coder ?',
        answer: (
          <>
            <p className="mb-2">Il existe plusieurs façons de contribuer&nbsp;:</p>
            <ul className="list-disc pl-6 mb-2">
              <li>Devenir modérateur bénévole</li>
              <li>Rédiger des guides et tutoriels</li>
              <li>Partager la plateforme sur les réseaux sociaux</li>
              <li>Signaler des arnaques</li>
            </ul>
            <p>
              Consultez notre{' '}
              <a href="/contribuer" className="text-blue-600 hover:underline">page Contribuer</a>.
            </p>
          </>
        ),
      },
      {
        question: 'Comment devenir modérateur ?',
        answer: (
          <>
            <p className="mb-2">
              Envoyez un email à{' '}
              <a href="mailto:contact@anti-pepins.biscuits-ia.com" className="text-blue-600 hover:underline">
                contact@anti-pepins.biscuits-ia.com
              </a>{' '}
              avec&nbsp;:
            </p>
            <ul className="list-disc pl-6 mb-2">
              <li>Votre expérience en modération</li>
              <li>Votre motivation</li>
              <li>Votre disponibilité</li>
            </ul>
            <p>Une formation vous sera proposée avant de commencer.</p>
          </>
        ),
      },
      {
        question: 'Comment signaler un problème sur la plateforme ?',
        answer: (
          <p>
            Utilisez le bouton &quot;Feedback&quot; en bas de page ou envoyez un email à{' '}
            <a href="mailto:contact@anti-pepins.biscuits-ia.com" className="text-blue-600 hover:underline">
              contact@anti-pepins.biscuits-ia.com
            </a>.
          </p>
        ),
      },
    ],
  },
  {
    category: 'Légal',
    items: [
      {
        question: 'Un signalement peut-il servir en justice ?',
        answer: (
          <p>
            Les signalements publiés sur Anti-Pépins sont des informations publiques destinées
            à informer. Ils ne constituent pas des preuves juridiques. Pour une procédure
            judiciaire, il faut obtenir des preuves officielles (plainte, constats d&apos;huissier, etc.).
          </p>
        ),
      },
      {
        question: 'Qui est responsable des signalements ?',
        answer: (
          <p>
            L&apos;association Biscuits IA est responsable de la plateforme. Les signalements
            sont publiés sous la responsabilité de leurs auteurs, après modération.
          </p>
        ),
      },
      {
        question: 'Comment signaler un contenu illégal ?',
        answer: (
          <>
            <p className="mb-2">
              Contactez-nous immédiatement à{' '}
              <a href="mailto:contact@anti-pepins.biscuits-ia.com" className="text-blue-600 hover:underline">
                contact@anti-pepins.biscuits-ia.com
              </a>.
            </p>
            <p>
              Nous retirerons le contenu dans les 24h et le signalerons aux autorités
              compétentes si nécessaire.
            </p>
          </>
        ),
      },
    ],
  },
] as const;

export default function FAQPage(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredData = React.useMemo(
    () =>
      FAQ_DATA.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) =>
          item.question.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      })),
    [searchTerm]
  );

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Foire Aux Questions</h1>
      <p className="mb-8 text-gray-700">
        Trouvez des réponses aux questions fréquentes sur le fonctionnement d&apos;Anti-Pépins.
        Si vous ne trouvez pas votre réponse, n&apos;hésitez pas à nous contacter.
      </p>

      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Rechercher dans la FAQ..."
      />

      {filteredData.map((category) => (
        <Section key={category.category} title={category.category} className="mb-12">
          {category.items.length > 0 ? (
            <div className="space-y-2">
              {category.items.map((item) => (
                <FAQItem
                  key={item.question}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Aucun résultat pour cette catégorie.</p>
          )}
        </Section>
      ))}

      <CallToAction
        href="mailto:contact@anti-pepins.biscuits-ia.com"
        text="Poser une question non répertoriée"
      />
      
      <p className="text-sm text-gray-500 mt-8">Dernière mise à jour&nbsp;: 31 mars 2026</p>
    </main>
  );
}