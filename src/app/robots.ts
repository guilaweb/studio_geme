import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/solucoes',
          '/precos',
          '/sobre',
          '/contact',
          '/ajuda',
          '/manual',
          '/privacidade',
          '/termos',
          '/blog',
          '/blog/*',
          '/feed.xml',
          '/sitemap.xml',
          '/robots.txt',
          '/manifest.webmanifest',
          '/opengraph-image',
          '/twitter-image',
          '/icon.svg',
          '/favicon.ico',
        ],
        disallow: [
          '/dashboard/',
          '/projects/',
          '/admin/',
          '/profile/',
          '/api/',
          '/extranet/',
          '/crm/',
          '/hr/',
          '/portal/projects/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/projects/',
          '/admin/',
          '/profile/',
          '/api/',
          '/extranet/',
          '/crm/',
          '/hr/',
          '/portal/projects/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/projects/',
          '/admin/',
          '/profile/',
          '/api/',
          '/extranet/',
          '/crm/',
          '/hr/',
          '/portal/projects/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
