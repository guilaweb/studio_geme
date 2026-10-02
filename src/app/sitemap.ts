import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo-config';
import { getAdminDb } from '@/lib/firebase-admin';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Post } from '@/types/blog';
import { DEFAULT_BLOG_POSTS } from '@/lib/blog-data';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date().toISOString();

  // Public static marketing and informational pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
      images: [`${SITE_URL}/opengraph-image`],
    },
    {
      url: `${SITE_URL}/solucoes`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
      images: [`${SITE_URL}/opengraph-image`],
    },
    {
      url: `${SITE_URL}/precos`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/sobre`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ajuda`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/manual`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/portal`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacidade`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/termos`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];

  // Dynamic published blog posts
  let dynamicBlogPosts: MetadataRoute.Sitemap = [];
  try {
    const adminDb = getAdminDb();
    if (adminDb) {
      const postsSnapshot = await adminDb
        .collection('posts')
        .where('isPublished', '==', true)
        .get();

      if (!postsSnapshot.empty) {
        dynamicBlogPosts = postsSnapshot.docs.map((doc) => {
          const data = doc.data() as Post;
          const updatedDate = (data.updatedAt as any)?.toDate
            ? (data.updatedAt as any).toDate()
            : data.updatedAt
            ? new Date(data.updatedAt as any)
            : new Date();

          return {
            url: `${SITE_URL}/blog/${data.slug}`,
            lastModified: updatedDate.toISOString(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
            images: data.featureImageUrl ? [data.featureImageUrl] : [`${SITE_URL}/opengraph-image`],
          };
        });
      }
    } else if (db) {
      const postsQuery = query(collection(db, 'posts'), where('isPublished', '==', true));
      const querySnapshot = await getDocs(postsQuery);
      dynamicBlogPosts = querySnapshot.docs.map((doc) => {
        const data = doc.data() as Post;
        const updatedDate = (data.updatedAt as any)?.toDate
          ? (data.updatedAt as any).toDate()
          : data.updatedAt
          ? new Date(data.updatedAt as any)
          : new Date();

        return {
          url: `${SITE_URL}/blog/${data.slug}`,
          lastModified: updatedDate.toISOString(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
          images: data.featureImageUrl ? [data.featureImageUrl] : [`${SITE_URL}/opengraph-image`],
        };
      });
    }
  } catch (error) {
    console.warn('Could not fetch dynamic blog posts for sitemap:', error);
  }

  // Merge default articles if not already present from Firestore
  const existingPostUrls = new Set(dynamicBlogPosts.map((entry) => entry.url));
  const fallbackBlogPosts: MetadataRoute.Sitemap = DEFAULT_BLOG_POSTS
    .filter((post) => post.isPublished)
    .filter((post) => !existingPostUrls.has(`${SITE_URL}/blog/${post.slug}`))
    .map((post) => {
      const rawDate: any = post.updatedAt || post.createdAt;
      const updatedDate = typeof rawDate?.toDate === 'function'
        ? rawDate.toDate()
        : rawDate instanceof Date
        ? rawDate
        : new Date(rawDate || Date.now());

      return {
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: updatedDate.toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.75,
        images: post.featureImageUrl ? [post.featureImageUrl] : [`${SITE_URL}/opengraph-image`],
      };
    });

  return [...staticPages, ...dynamicBlogPosts, ...fallbackBlogPosts];
}
