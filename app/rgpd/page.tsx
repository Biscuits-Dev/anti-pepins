import type { Metadata } from 'next';
import { MainLayout, SectionHeader } from '@/components/layout';

export const metadata: Metadata = {
  title:       'Politique de Confidentialité - Anti Pepins',
  description: 'Découvrez comment Anti Pepins protège vos données conformément au RGPD.',
};

const CONTACT_EMAIL = 'contact@biscuits-ia.com' as const;

const EMAIL_RGPD_TEMPLATE = [
  "Objet : Demande d'accès à mes données personnelles",
  '',
  'Bonjour,',
  '',
  "Je souhaite exercer mon droit d'accès aux données me concernant sur la plateforme Anti Pepins.",
  'Merci de me transmettre une copie de mes données dans un format structuré.',
  '',
  'Cordialement,',
  '[Votre nom]',
  '[Votre email]',
  '[Date]',
].join('\n');

function RgpdSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Ul({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <ul className="list-disc pl-6 text-slate-700 space-y-1">
      {children}
    </ul>
  );
}

export default function RGPDPage(): React.JSX.Element {
  return (
    <MainLayout>
      <section className="bg-slate-50 py-16" aria-labelledby="rgpd-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            id="rgpd-heading"
            title="Politique de Confidentialité"
            subtitle="Découvrez comment Anti Pepins protège vos données conformément au RGPD" />
        </div>
      </section>

      <section className="py-16" aria-label="Contenu de la politique de confidentialité">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Introduction */}
          <div>
            <p className="text-slate-700">
              Anti Pepins est une initiative open-source de l&apos;association{' '}

              <a href="https://biscuits-ia.com"
                className="text-emerald-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Biscuits IA
              </a>.
              Cette politique explique comment nous traitons vos données dans le respect du RGPD.
            </p>
          </div>

          <RgpdSection title="Données Collectées">
            <p className="text-slate-700 mb-2">Nous collectons les données suivantes :</p>
            <Ul>
              <li><strong>Comptes utilisateurs</strong> : email, nom (facultatif), rôle.</li>
              <li><strong>Signalements</strong> : titre, description, preuves (anonymisées si publiées).</li>
              <li><strong>Logs d&apos;activité</strong> : actions des utilisateurs (connexion, signalement, modération).</li>
              <li><strong>Formulaire de contact</strong> : nom, email, sujet, message et adresse IP (traçabilité anti-abus, conservée 12 mois).</li>
            </Ul>
          </RgpdSection>

          <RgpdSection title="Finalités du Traitement">
            <p className="text-slate-700 mb-2">Vos données sont utilisées pour :</p>
            <Ul>
              <li>Gérer les comptes utilisateurs et l&apos;authentification.</li>
              <li>Traiter et modérer les signalements d&apos;arnaques.</li>
              <li>Améliorer la plateforme et détecter les tendances.</li>
              <li>Assurer la sécurité et prévenir les abus.</li>
              <li>Répondre aux demandes envoyées via le formulaire de contact.</li>
            </Ul>
          </RgpdSection>

          <RgpdSection title="Destinataires des Données">
            <p className="text-slate-700 mb-2">Vos données sont accessibles à :</p>
            <Ul>
              <li><strong>L&apos;équipe de modération</strong> : pour évaluer les signalements.</li>
              <li><strong>Public</strong> : uniquement les signalements approuvés (anonymisés).</li>
            </Ul>
            <p className="text-slate-700 mt-2">
              Nous ne vendons ni ne partageons vos données avec des tiers à des fins commerciales.
            </p>
          </RgpdSection>

          <RgpdSection title="Durée de Conservation">
            <p className="text-slate-700 mb-2">Les données sont conservées selon les règles suivantes :</p>
            <Ul>
              <li><strong>Comptes utilisateurs</strong> : 3 ans après la dernière activité.</li>
              <li><strong>Signalements approuvés</strong> : archivés indéfiniment pour référence.</li>
              <li><strong>Signalements rejetés</strong> : supprimés après 6 mois.</li>
              <li><strong>Logs d&apos;activité</strong> : conservés 12 mois pour audit.</li>
              <li><strong>Données de contact</strong> : conservées 12 mois après la réponse apportée.</li>
            </Ul>
          </RgpdSection>

          <RgpdSection title="Vos Droits">
            <p className="text-slate-700 mb-2">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <Ul>
              <li>Droit d&apos;accès à vos données personnelles.</li>
              <li>Droit de rectification des informations inexactes.</li>
              <li>Droit à l&apos;effacement (droit à l&apos;oubli).</li>
              <li>Droit à la limitation du traitement.</li>
              <li>Droit d&apos;opposition au traitement.</li>
              <li>Droit à la portabilité de vos données.</li>
            </Ul>
            <p className="text-slate-700 mt-4">
              Vous pouvez exercer ces droits en nous contactant à{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-emerald-600 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>.
            </p>

            <div className="bg-slate-100 p-4 rounded-lg mt-4">
              <h3 className="font-semibold mb-2 text-slate-900">
                Modèle d&apos;email pour une demande RGPD :
              </h3>
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                {EMAIL_RGPD_TEMPLATE}
              </pre>
            </div>
          </RgpdSection>

          <RgpdSection title="Sécurité des Données">
            <p className="text-slate-700 mb-2">
              Nous mettons en place les mesures suivantes :
            </p>
            <Ul>
              <li>Chiffrement des données au repos (AES-256) et en transit (TLS).</li>
              <li>Authentification multi-facteurs pour l&apos;accès administrateur.</li>
              <li>Audits réguliers des accès et des activités suspectes.</li>
              <li>Politique de mots de passe stricts (minimum 12 caractères).</li>
              <li>Rate limiting sur les formulaires pour prévenir les abus.</li>
            </Ul>
            <p className="text-slate-700 mt-2">
              En cas de violation de données, nous vous informerons dans les 72 heures
              conformément aux obligations légales.
            </p>
          </RgpdSection>

          <RgpdSection title="Cookies">
            <p className="text-slate-700 mb-2">
              Anti Pepins utilise uniquement des cookies techniques nécessaires au fonctionnement du site :
            </p>
            <Ul>
              <li>Session cookies pour l&apos;authentification.</li>
              <li>Cookies de préférences (langue, thème).</li>
            </Ul>
            <p className="text-slate-700 mt-2">
              Nous n&apos;utilisons <strong>aucun cookie de tracking</strong> ni de publicité ciblée.
            </p>
          </RgpdSection>

          <div className="text-center pt-4">
            <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
            Contactez-nous pour toute question RGPD
          </a>
        </div>

      </div>
    </section><p className="text-sm text-slate-500 text-center pb-8">
        Dernière mise à jour : 31 mars 2026
      </p>
      
    </MainLayout>
  );
}