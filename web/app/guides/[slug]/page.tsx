import { getGuideBySlug, getAllGuides } from "@/lib/mdx";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Clock, Share2 } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { BrandedContainer } from "@/components/features/branded-container";
import { Metadata } from "next";

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const post = getGuideBySlug(slug);

    if (!post) {
        return {
            title: "Guide Not Found",
        };
    }

    return {
        title: `${post.meta.title} | BeyBracket Academy`,
        description: post.meta.description,
        openGraph: {
            title: post.meta.title,
            description: post.meta.description,
            type: "article",
            images: post.meta.image ? [post.meta.image] : [],
        },
    };
}

export async function generateStaticParams() {
    const posts = getAllGuides();
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export default async function GuidePage({ params }: Props) {
    const { slug } = await params;
    const post = getGuideBySlug(slug);

    if (!post) {
        notFound();
    }

    return (
        <BrandedContainer className="min-h-screen container mx-auto px-4 py-8 md:py-16">
            {/* Back Link */}
            <div className="mb-8">
                <Link href="/guides" className="inline-flex items-center text-muted-foreground hover:text-cyan-400 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Guides
                </Link>
            </div>

            {/* Article Container */}
            <article className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="mb-12 text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest">
                        <span>{post.meta.category || "Guide"}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-blue-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.2)] leading-tight">
                        {post.meta.title}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400 font-mono">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-500" />
                            {post.meta.author}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-cyan-500" />
                            {post.meta.date}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-500" />
                            5 min read
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-cyan-400 hover:prose-a:text-cyan-300 prose-img:rounded-xl prose-hr:border-slate-800 mt-12 pt-12 border-t border-slate-800/50">
                    <MDXRemote
                        source={post.content}
                        options={{
                            mdxOptions: {
                                remarkPlugins: [remarkGfm],
                            },
                        }}
                    />
                </div>

                {/* Share / Footer */}
                <div className="mt-16 pt-8 border-t border-slate-800 flex justify-between items-center">
                    <div className="text-muted-foreground text-sm">
                        Thanks for reading!
                    </div>
                    <div className="flex gap-4">
                        {/* Placeholder for share buttons */}
                        <button className="flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                            <Share2 className="w-4 h-4" /> Share Guide
                        </button>
                    </div>
                </div>
            </article>
        </BrandedContainer>
    );
}
