'use client';

import { motion } from 'framer-motion';

export default function TermsOfServicePage() {
  return (
    <div className="w-full min-h-screen bg-background font-mono">
      {/* Background with subtle grid */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground font-sans">
              Last updated:{' '}
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none font-sans space-y-8">
            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using Kosuke (&quot;the Service&quot;), you accept and agree to be
                bound by the terms and provision of this agreement. If you do not agree to abide by
                the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">2. Service Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                Kosuke is a development platform that combines AI-powered prototyping with expert
                developer support to help users build and ship functional products. The service
                includes AI-assisted code generation, developer consultation, and project export
                capabilities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">3. Private Alpha Access</h2>
              <p className="text-muted-foreground leading-relaxed">
                During the Private Alpha phase, access to the Service is limited and by invitation
                only. We reserve the right to modify, suspend, or terminate access to the Service at
                any time during this phase. Features and functionality may change without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">4. User Responsibilities</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">You agree to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Provide accurate and complete information when using the Service</li>
                  <li>Use the Service only for lawful purposes</li>
                  <li>Not attempt to reverse engineer or compromise the security of the Service</li>
                  <li>
                    Not use the Service to generate malicious, harmful, or inappropriate content
                  </li>
                  <li>Respect the intellectual property rights of others</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">5. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of the code and projects you create using Kosuke. However, by
                using the Service, you grant us a limited license to process and analyze your
                content to provide the Service. We do not claim ownership of your projects or
                generated code.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">
                6. Developer Support Services
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our developer support services are provided on a best-effort basis. While we strive
                to provide high-quality assistance, we do not guarantee that all issues will be
                resolved or that projects will meet specific performance requirements. Support
                availability may vary during the Private Alpha phase.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">7. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided &quot;as is&quot; without warranties of any kind. We shall
                not be liable for any indirect, incidental, special, or consequential damages
                arising out of your use of the Service. Our total liability shall not exceed the
                amount paid by you for the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">8. Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy to understand how
                we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">9. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your access to the Service at any time, with or without
                cause, with or without notice. Upon termination, you may export your projects and
                data as available through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of any
                significant changes via email or through the Service. Continued use of the Service
                after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">11. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us through
                our support channels available in the Service.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
