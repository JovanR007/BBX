import Link from "next/link";

export default function PrivacyPolicyPage() {
    return (
        <div className="space-y-8">
            <div className="border-b border-border/50 pb-8">
                <p className="text-sm font-medium text-primary mb-2">Legal Documentation</p>
                <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
                <p className="text-muted-foreground mt-4 text-lg">
                    Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </div>

            <section className="space-y-4">
                <h2>1. Introduction</h2>
                <p>
                    BeyBracket ("we," "our," or "us") is committed to protecting your privacy.
                    This Privacy Policy explains how we collect, use, and share information about you when you use our website, mobile applications, and other online products and services (collectively, the "Services").
                </p>
            </section>

            <section className="space-y-4">
                <h2>2. Information We Collect</h2>
                <h3>2.1 Information You Provide to Us</h3>
                <p>
                    We collect information you provide directly to us. For example, we collect information when you create an account, fill out a form, request customer support, or otherwise communicate with us. The types of information we may collect include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Account Information:</strong> Your name, email address, password, and public profile information (username, avatar).</li>
                    <li><strong>Store Information:</strong> If you apply for a store account, we collect your store name, address, contact number, and business details.</li>
                    <li><strong>Tournament Data:</strong> Information about tournaments you host or participate in, including results and match history.</li>
                </ul>

                <h3>2.2 Information We Collect Automatically</h3>
                <p>
                    When you access or use our Services, we automatically collect information about you, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Log Information:</strong> We log information about your use of the Services, including the type of browser you use, access times, pages viewed, your IP address, and the page you visited before navigating to our Services.</li>
                    <li><strong>Device Information:</strong> We collect information about the computer or mobile device you use to access our Services, including the hardware model, operating system and version, unique device identifiers, and mobile network information.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2>3. How We Use Information</h2>
                <p>
                    We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Provide, maintain, and improve our Services;</li>
                    <li>Process transactions and send you related information, including confirmations and invoices;</li>
                    <li>Send you technical notices, updates, security alerts, and support and administrative messages;</li>
                    <li>Respond to your comments, questions, and requests and provide customer service;</li>
                    <li>Communicate with you about products, services, offers, promotions, rewards, and events offered by BeyBracket and others, and provide news and information we think will be of interest to you;</li>
                    <li>Monitor and analyze trends, usage, and activities in connection with our Services;</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2>4. Sharing of Information</h2>
                <p>
                    We may share information about you as follows or as otherwise described in this Privacy Policy:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>With vendors, consultants, and other service providers who need access to such information to carry out work on our behalf;</li>
                    <li>In response to a request for information if we believe disclosure is in accordance with any applicable law, regulation, or legal process;</li>
                    <li>If we believe your actions are inconsistent with our user agreements or policies, or to protect the rights, property, and safety of BeyBracket or others;</li>
                </ul>
                <p>
                    <strong>Public Profile:</strong> Your username, avatar, and tournament history are public and visible to other users of the Service.
                </p>
            </section>

            <section className="space-y-4">
                <h2>5. Data Security</h2>
                <p>
                    We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
                </p>
            </section>

            <section className="space-y-4">
                <h2>6. Your Choices</h2>
                <h3>Account Information</h3>
                <p>
                    You may update, correct, or delete information about you at any time by logging into your online account or contacting us. If you wish to delete your account, please contact us at <a href="mailto:support@beybracket.com" className="text-primary hover:underline">support@beybracket.com</a>, but note that we may retain certain information as required by law or for legitimate business purposes.
                </p>
            </section>

            <section className="space-y-4">
                <h2>7. Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@beybracket.com" className="text-primary hover:underline">support@beybracket.com</a>.
                </p>
            </section>
        </div>
    );
}
