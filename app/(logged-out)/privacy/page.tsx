'use client';

import { motion } from 'framer-motion';

export default function PrivacyPolicyPage() {
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
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Privacy Policy</h1>
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
              <h2 className="text-2xl font-semibold font-mono mb-4">1. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium font-mono mb-2">Account Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    When you create an account, we collect your email address, name, and other basic
                    profile information. This information is managed through our authentication
                    provider, Clerk.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium font-mono mb-2">Project Data</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We collect and store the projects you create, including code, configurations,
                    and related metadata. This data is necessary to provide our AI-assisted
                    development services.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium font-mono mb-2">Usage Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We collect information about how you use the Service, including feature usage,
                    performance metrics, and error logs to improve the platform.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">
                2. How We Use Your Information
              </h2>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Provide and improve the Kosuke development platform</li>
                  <li>Generate AI-assisted code and recommendations</li>
                  <li>Connect you with our developer support team when requested</li>
                  <li>Send important service updates and notifications</li>
                  <li>Analyze usage patterns to enhance the user experience</li>
                  <li>Ensure the security and integrity of the Service</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">3. Information Sharing</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  We do not sell, trade, or otherwise transfer your personal information to third
                  parties, except in the following circumstances:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>With your explicit consent</li>
                  <li>
                    To our trusted service providers who assist in operating the Service (e.g.,
                    Clerk for authentication, cloud hosting providers)
                  </li>
                  <li>When required by law or to protect our rights and safety</li>
                  <li>In connection with a business transfer or acquisition</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">4. AI and Machine Learning</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your project data may be used to train and improve our AI models. However, we take
                steps to anonymize and aggregate this data to protect your privacy. We do not use
                your specific project details to benefit other users directly, and your code remains
                your intellectual property.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your information,
                including encryption in transit and at rest, secure authentication through Clerk,
                and regular security audits. However, no method of transmission over the Internet is
                100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information and project data for as long as your account is
                active or as needed to provide the Service. You may request deletion of your account
                and associated data at any time, subject to legal and operational requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">7. Your Rights</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Access and review your personal information</li>
                  <li>Request corrections to inaccurate data</li>
                  <li>Request deletion of your account and data</li>
                  <li>Export your project data</li>
                  <li>Withdraw consent for data processing where applicable</li>
                  <li>File complaints with relevant data protection authorities</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to enhance your experience, maintain your
                session, and analyze usage patterns. You can control cookie settings through your
                browser preferences, though some functionality may be limited if cookies are
                disabled.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">9. Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service integrates with third-party providers including Clerk (authentication),
                cloud hosting services, and analytics tools. These providers have their own privacy
                policies governing the use of your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">
                10. International Data Transfers
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be processed and stored in countries other than your own. We
                ensure appropriate safeguards are in place for international data transfers in
                compliance with applicable privacy laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">11. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service is not intended for children under 13 years of age. We do not knowingly
                collect personal information from children under 13. If you believe we have
                collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">12. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any
                material changes via email or through the Service. Your continued use of the Service
                after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">13. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or wish to exercise your privacy
                rights, please contact us through our support channels available in the Service.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
