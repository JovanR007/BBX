import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://beybracket.com';

    // 1. Static Routes
    const routes = ['', '/tournaments', '/stores', '/leaderboard'].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily' as const,
        priority: 1.0,
    }));

    // 2. Dynamic Tournaments (Public: Started or Completed)
    // Limit to most recent 1000 to avoid massive sitemaps (or implement paging later)
    const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, updated_at')
        .in('status', ['started', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1000);

    const tournamentRoutes = (tournaments || []).map((t) => ({
        url: `${baseUrl}/t/${t.id}`,
        lastModified: t.updated_at || new Date().toISOString(),
        changeFrequency: 'hourly' as const,
        priority: 0.8,
    }));

    // 3. Dynamic Stores
    const { data: stores } = await supabase
        .from('stores')
        .select('slug, updated_at')
        .not('slug', 'is', null); // Ensure slug exists

    const storeRoutes = (stores || []).map((s) => ({
        url: `${baseUrl}/s/${s.slug}`,
        lastModified: s.updated_at || new Date().toISOString(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
    }));

    // 4. Dynamic Profiles (Users)
    // Fetch users who have participated in at least one tournament? Or just all public profiles.
    // For now, let's just fetch all profiles with usernames
    const { data: profiles } = await supabase
        .from('profiles')
        .select('username, updated_at')
        .not('username', 'is', null)
        .limit(1000);

    const profileRoutes = (profiles || []).map((p) => ({
        url: `${baseUrl}/u/${p.username}`,
        lastModified: p.updated_at || new Date().toISOString(),
        changeFrequency: 'weekly' as const, // Profiles change less often
        priority: 0.6,
    }));

    return [...routes, ...tournamentRoutes, ...storeRoutes, ...profileRoutes];
}
