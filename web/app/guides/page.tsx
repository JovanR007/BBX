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

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guides.map((guide) => (
                    <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group relative block h-full">
                        {/* Glow Effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-2xl opacity-0 group-hover:opacity-100 blur-md transition duration-500" />

                        {/* Card Content */}
                        <div className="relative h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-8 flex flex-col hover:border-cyan-500/50 transition-colors duration-300">

                            {/* Category Pill */}
                            <div className="mb-6 flex justify-between items-start">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono uppercase tracking-widest text-cyan-400 group-hover:bg-cyan-950 group-hover:border-cyan-500/50 transition-colors">
                                    {guide.category || 'Guide'}
                                </span>
                                <BookOpen className="w-6 h-6 text-slate-800 group-hover:text-cyan-500/20 transition-colors" />
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl font-black tracking-tight text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-cyan-200 transition-all duration-300">
                                {guide.title}
                            </h2>

                            {/* Description */}
                            <p className="text-slate-400 leading-relaxed mb-8 flex-1">
                                {guide.description}
                            </p>

                            {/* Footer / Meta */}
                            <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-6 border-t border-slate-900 group-hover:border-slate-800 transition-colors">
                                <div className="flex items-center gap-2">
                                    <User className="w-3 h-3" />
                                    <span>{guide.author}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>{guide.date}</span>
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
