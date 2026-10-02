import { GET as getBlogFeed } from '@/app/blog/feed.xml/route';

export const dynamic = 'force-dynamic';

export async function GET() {
    return getBlogFeed();
}
