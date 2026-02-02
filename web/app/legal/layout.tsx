export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="container max-w-4xl py-12 md:py-20 px-4">
            <div className="prose prose-invert prose-slate max-w-none">
                {children}
            </div>
        </div>
    );
}
