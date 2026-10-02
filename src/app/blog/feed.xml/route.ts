import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export async function GET() {
    const baseUrl = 'https://profundidade.app';
    const blogUrl = `${baseUrl}/blog`;

    let itemsXml = '';
    let latestDate = new Date();

    try {
        const adminDb = getAdminDb();
        if (adminDb) {
            const postsSnapshot = await adminDb
                .collection('posts')
                .where('isPublished', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(30)
                .get();

            if (!postsSnapshot.empty) {
                const firstDate = postsSnapshot.docs[0].data().createdAt;
                latestDate = firstDate?.toDate ? firstDate.toDate() : new Date();

                itemsXml = postsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const postUrl = `${baseUrl}/blog/${data.slug}`;
                    const pubDate = data.createdAt?.toDate ? data.createdAt.toDate().toUTCString() : new Date().toUTCString();
                    const title = escapeXml(data.title || '');
                    const excerpt = escapeXml(data.excerpt || data.content?.substring(0, 250) || '');
                    const author = escapeXml(data.author?.displayName || 'Equipa Profundidade');
                    const category = escapeXml(data.category || 'Geral');

                    return `
    <item>
      <title>${title}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${author}</author>
      <category>${category}</category>
      <description>${excerpt}</description>
    </item>`;
                }).join('\n');
            }
        }
    } catch (error) {
        console.error('Error generating RSS feed:', error);
    }

    const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog &amp; Notícias | Profundidade</title>
    <link>${blogUrl}</link>
    <description>Artigos técnicos, estudos de caso, inovação em materiais e gestão de projetos no setor da construção civil, infraestruturas e mineração em Angola.</description>
    <language>pt-AO</language>
    <lastBuildDate>${latestDate.toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${baseUrl}/favicon.svg</url>
      <title>Profundidade Blog</title>
      <link>${blogUrl}</link>
    </image>
    ${itemsXml}
  </channel>
</rss>`;

    return new NextResponse(rssFeed, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
    });
}
