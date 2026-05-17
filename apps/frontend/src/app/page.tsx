import type { Metadata } from 'next';
import {
  LandingNav,
  HeroSection,
  ProofSection,
  PositioningSection,
  ModulesSection,
  RolesSection,
  AnalyticsSection,
  MultibranchSection,
  FinanceSection,
  AiSection,
  DemoSection,
  FaqSection,
  FooterSection,
} from '@/components/landing';

export const metadata: Metadata = {
  title: 'Xedu — Ta‘lim guruhi uchun operatsion tizim',
  description:
    'Xedu: hususiy maktablar va ta‘lim guruhlari uchun ERP + LMS + CRM platformasi. Akademik jarayonlar, moliya, aloqa va analitikani barcha filiallar uchun boshqaring.',
  keywords: [
    'ta‘lim boshqaruv tizimi',
    'maktab ERP',
    'LMS',
    'CRM',
    'ko‘p filial maktab',
    'ta‘lim platformasi',
    'xedu',
  ],
  openGraph: {
    title: 'Xedu — Ta‘lim guruhi uchun operatsion tizim',
    description:
      'Akademik jarayonlar, moliya, aloqa va analitikani barcha filiallar uchun boshqaring.',
    type: 'website',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main>
        <HeroSection />
        <ProofSection />
        <PositioningSection />
        <ModulesSection />
        <RolesSection />
        <AnalyticsSection />
        <MultibranchSection />
        <FinanceSection />
        <AiSection />
        <DemoSection />
        <FaqSection />
      </main>
      <FooterSection />
    </div>
  );
}
