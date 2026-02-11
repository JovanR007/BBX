import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TournamentDashboardClient } from './_components/tournament-dashboard-client';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabaseAdmin.from('tournaments').select('*');

    if (isUUID) {
        query = query.eq('id', id);
    } else {
        query = query.eq('slug', id);
    }

    const { data: tournament } = await query.single();

    if (!tournament) {
        return {
            title: 'Tournament Not Found',
        };
    }

    return {
        title: `${tournament.name} | BeyBracket`,
        description: `Join ${tournament.name} at ${tournament.location}. Managed by BeyBracket.`,
        openGraph: {
            title: `${tournament.name} - Beyblade Tournament`,
            description: `Check out the standings and bracket for ${tournament.name}.`,
            type: 'website',
            images: [
                {
                    url: 'https://beybracket.com/og-image.png', // Or dynamic OG image using vercel/og later
                    width: 1200,
                    height: 630,
                    alt: tournament.name,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${tournament.name} - BeyBracket`,
            description: `Live results for ${tournament.name}.`,
        },
    };
}

export default async function Page({ params }: Props) {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);

    // Re-fetch for Schema
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabaseAdmin.from('tournaments').select('*');

    if (isUUID) {
        query = query.eq('id', id);
    } else {
        query = query.eq('slug', id);
    }

    const { data: tournament } = await query.single();

    const jsonLd = tournament ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: tournament.name,
        startDate: tournament.start_time,
        endDate: tournament.end_time || tournament.start_time, // Fallback
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
            '@type': 'Place',
            name: tournament.location,
            address: {
                '@type': 'PostalAddress',
                addressLocality: tournament.location, // simplified
            }
        },
        image: ['https://beybracket.com/og-image.png'],
        description: `Unleash your Beyblade spirit at ${tournament.name}. Join the bracket!`,
        organizer: {
            '@type': 'Organization',
            name: 'BeyBracket',
            url: 'https://beybracket.com'
        }
    } : null;

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <TournamentDashboardClient id={id} />
        </>
    );
}
