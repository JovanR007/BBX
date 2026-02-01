import Link from "next/link";
import { getAllGuides } from "@/lib/mdx";
import { BrandedContainer } from "@/components/features/branded-container";
import { ArrowLeft, BookOpen, Calendar, User } from "lucide-react";
import Image from "next/image";

export const metadata = {
    title: "BeyBracket Guides | Learn Beyblade X Strategy",
    description: "Master Beyblade X with our comprehensive guides on Swiss Format, Tournament Hosting, and Scoring Rules.",
};

export default function GuidesIndex() {
    const guides = getAllGuides();

    return (
        <BrandedContainer className="min-h-screen container mx-auto px-4 py-8 md:py-16">
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-cyan-400 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Link>
            </div>

            <div className="text-center space-y-4 mb-16">
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                    BeyBracket Academy
                </h1>
                <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                    Level up your game. Learn the rules, master the format, and become a tournament pro.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {guides.map((guide) => (
                    <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group relative block h-full">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-100 blur transition duration-500" />
                        <div className="relative h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                            <div className="aspect-video relative overflow-hidden bg-slate-900 border-b border-slate-800">
                                {guide.image ? (
                                    <Image
                                        src={guide.image}
                                        alt={guide.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                                        <BookOpen className="w-12 h-12 opacity-50" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur border border-slate-700 text-xs px-2 py-1 rounded text-cyan-400 uppercase tracking-widest font-mono">
                                    {guide.category || 'Guide'}
                                </div>
                            </div>

                            <div className="p-6 flex flex-col flex-1">
                                <h2 className="text-xl font-bold mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">
                                    {guide.title}
                                </h2>
                                <p className="text-sm text-neutral-400 mb-4 line-clamp-3 flex-1">
                                    {guide.description}
                                </p>

                                <div className="flex items-center justify-between text-xs text-slate-500 font-mono mt-auto pt-4 border-t border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3 h-3" />
                                        {guide.author}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {guide.date}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {guides.length === 0 && (
                <div className="text-center py-20 text-muted-foreground border border-dashed border-slate-800 rounded-xl">
                    <p>No guides published yet. Check back soon!</p>
                </div>
            )}
        </BrandedContainer>
    );
}
