import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://beybracket.com';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/admin/', '/t/*/admin/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
