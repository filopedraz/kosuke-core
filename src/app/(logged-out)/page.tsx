import { Home } from '@/components/home';
import Script from 'next/script';

export default function RootPage() {
  return (
    <>
      <HomepageStructuredData />
      <Home />
    </>
  );
}

export const HomepageStructuredData = () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kosuke',
    description:
      'Your technical cofounder for the 0 to 1. We deliver high-quality, market-ready software so you can launch your startup with confidence.',
    url: baseUrl,
    sameAs: ['https://github.com/Kosuke-Org/kosuke-core'],
  };

  const softwareData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kosuke',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web Browser',
    description:
      'Your technical cofounder for the 0 to 1. We deliver high-quality, market-ready software so you can launch your startup with confidence.',
    author: {
      '@type': 'Organization',
      name: 'Kosuke',
    },
    programmingLanguage: ['TypeScript', 'React', 'Next.js'],
    runtimePlatform: 'Node.js',
    codeRepository: 'https://github.com/Kosuke-Org/kosuke-core',
  };

  return (
    <>
      <Script
        id="website-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteData),
        }}
      />
      <Script
        id="software-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareData),
        }}
      />
    </>
  );
};
