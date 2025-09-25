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
            <p className="text-muted-foreground font-sans">Last updated: September 26, 2025</p>
          </div>

          {/* Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none font-sans space-y-8">
            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">1. General Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy describes how Kosuke collects, uses, and protects the personal
                information of users who visit our website and participate in our surveys.
              </p>
              <div className="space-y-3 mt-4">
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Data Controller:</strong> Filippo Pedrazzini
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:filippo.pedrazzini@joandko.io"
                    className="text-primary hover:underline"
                  >
                    filippo.pedrazzini@joandko.io
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">2. What Data We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect the following types of information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  <strong>Survey Data:</strong> Your email address and the technical product
                  information you voluntarily provide in the survey.
                </li>
                <li>
                  <strong>Contact Data:</strong> Your name, last name, if you voluntarily provide
                  them.
                </li>
                <li>
                  <strong>Browsing Data:</strong> Technical information about your visit to our site
                  (e.g., IP address, browser type, device).
                </li>
                <li>
                  <strong>Communication Data:</strong> The content of any messages you send to us
                  through our contact channels.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">
                3. How We Use Your Data (Purpose of Processing)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Your personal data is used for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>To analyze the technical information submitted through the survey.</li>
                <li>
                  To contact you with follow-up questions or information related to your survey
                  submission.
                </li>
                <li>To respond to your inquiries.</li>
                <li>To improve our website&apos;s user experience.</li>
                <li>To comply with legal and contractual obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">
                4. Legal Basis for Processing
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The processing of your personal data is based on your consent, provided by actively
                submitting the survey. It is also based on the need to perform pre-contractual
                measures taken at your request or to comply with legal obligations to which the Data
                Controller is subject.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">5. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal data only for as long as necessary to fulfill the purposes
                for which it was collected and to comply with applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  <strong>Access</strong> your personal data.
                </li>
                <li>
                  <strong>Rectify</strong> inaccurate or incomplete data.
                </li>
                <li>
                  <strong>Erase</strong> your data (right to be forgotten).
                </li>
                <li>
                  <strong>Restrict</strong> the processing of your data.
                </li>
                <li>
                  <strong>Data portability</strong>.
                </li>
                <li>
                  <strong>Object</strong> to the processing of your data.
                </li>
                <li>
                  <strong>Withdraw your consent</strong> at any time.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">7. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational measures to protect your
                personal data from unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">8. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                To exercise your rights or for any questions about this Privacy Policy, please
                contact us at: XXXXXXXX
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold font-mono mb-4">
                9. Changes to this Privacy Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy may be updated periodically. Any changes will be posted on this
                page with the corresponding &quot;Last Updated&quot; date.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
