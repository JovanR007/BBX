import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const guidesDirectory = path.join(process.cwd(), 'content/guides');

export interface GuideMeta {
    slug: string;
    title: string;
    description: string;
    date: string;
    author: string;
    image?: string;
    category?: string;
}

export interface GuidePost {
    meta: GuideMeta;
    content: string;
}

export function getAllGuides(): GuideMeta[] {
    // Navigate to content/guides
    if (!fs.existsSync(guidesDirectory)) {
        return [];
    }

    const fileNames = fs.readdirSync(guidesDirectory);
    const allGuidesData = fileNames.map((fileName) => {
        const slug = fileName.replace(/\.mdx$/, '');
        const fullPath = path.join(guidesDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data } = matter(fileContents);

        return {
            slug,
            ...data,
        } as GuideMeta;
    });

    // Sort posts by date
    return allGuidesData.sort((a, b) => {
        if (a.date < b.date) {
            return 1;
        } else {
            return -1;
        }
    });
}

export function getGuideBySlug(slug: string): GuidePost | null {
    const fullPath = path.join(guidesDirectory, `${slug}.mdx`);

    if (!fs.existsSync(fullPath)) {
        return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
        meta: {
            slug,
            ...data,
        } as GuideMeta,
        content,
    };
}
