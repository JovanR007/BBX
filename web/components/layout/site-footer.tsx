"use client";

import Link from "next/link";
import { Coffee } from "lucide-react";

export function SiteFooter() {
    return (
        <footer className="border-t bg-muted/20 py-12 text-sm text-muted-foreground mt-auto">
            <div className="container px-4 grid md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="space-y-4">
                    <h3 className="font-bold text-foreground text-lg">BeyBracket</h3>
                    <p className="max-w-xs">
                        The ultimate tournament manager for Beyblade X communities.
                        Connect, compete, and conquer.
                    </p>
                    <div className="flex bg-slate-800/50 w-fit px-3 py-1 rounded-full border border-slate-700/50">
                        <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
                            <Coffee className="w-3 h-3 text-amber-500" /> Powered by Passion
                        </span>
                    </div>
                </div>

                {/* Legal */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Legal</h4>
                    <ul className="space-y-2">
                        <li>
                            <Link href="/legal/terms" className="hover:text-primary transition-colors">
                                Terms of Service
                            </Link>
                        </li>
                        <li>
                            <Link href="/legal/privacy" className="hover:text-primary transition-colors">
                                Privacy Policy
                            </Link>
                        </li>
                        <li>
                            <Link href="/legal/terms/member" className="hover:text-primary transition-colors">
                                Member Guidelines
                            </Link>
                        </li>
                        <li>
                            <Link href="/legal/terms/store-owner" className="hover:text-primary transition-colors">
                                Store Terms
                            </Link>
                        </li>
                        <li>
                            <Link href="/legal/terms/organizer" className="hover:text-primary transition-colors">
                                Organizer Rules
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Navigation */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Explore</h4>
                    <ul className="space-y-2">
                        <li>
                            <Link href="/tournaments" className="hover:text-primary transition-colors">
                                Events
                            </Link>
                        </li>
                        <li>
                            <Link href="/stores" className="hover:text-primary transition-colors">
                                Store Directory
                            </Link>
                        </li>
                        <li>
                            <Link href="/leaderboard" className="hover:text-primary transition-colors">
                                Leaderboards
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Contact */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Support</h4>
                    <ul className="space-y-2">
                        <li>
                            <a href="mailto:support@beybracket.com" className="hover:text-primary transition-colors">
                                Contact Us
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://ko-fi.com/godtis"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-amber-500 transition-colors"
                            >
                                Donate & Support
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="container px-4 mt-8 pt-8 border-t border-border/50 text-center text-xs">
                <p>&copy; {new Date().getFullYear()} BeyBracket. All rights reserved.</p>
                <p className="mt-2 opacity-50">Not affiliated with Takara Tomy or Hasbro.</p>
            </div>
        </footer>
    );
}
