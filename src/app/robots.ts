import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

export default function robots(): MetadataRoute.Robots {
  const isProduction = baseUrl === 'https://kosuke.ai';

  if (!isProduction) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/projects/', '/settings/', '/sign-in/', '/sign-up/', '/sso-callback/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
