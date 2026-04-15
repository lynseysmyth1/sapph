import { useNavigate } from 'react-router-dom'
import './Legal.css'

export default function Terms() {
  const navigate = useNavigate()

  return (
    <div className="legal-page">
      <div className="legal-header">
        <button className="legal-back" onClick={() => navigate(-1)}>‹ Back</button>
      </div>
      <div className="legal-content">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: February 2026</p>

        <div className="legal-prototype-banner">
          <strong>Prototype notice:</strong> These are prototype Terms of Service for testing purposes only. Legally reviewed terms will be published before public launch.
        </div>

        <h2>1. Acceptance</h2>
        <p>By creating an account on Sapph, you agree to these Terms of Service. If you do not agree, you must not use the app.</p>

        <hr className="legal-divider" />

        <h2>2. Eligibility</h2>
        <p>You must be 18 or older to use Sapph. By creating an account you confirm that you meet this requirement.</p>

        <hr className="legal-divider" />

        <h2>3. Your Account</h2>
        <p>You are responsible for keeping your account credentials secure. You must provide accurate information and keep it up to date. You may only create one account.</p>

        <hr className="legal-divider" />

        <h2>4. Acceptable Use</h2>
        <p>You must not:</p>
        <ul>
          <li>Impersonate another person or misrepresent your identity</li>
          <li>Post content that is abusive, threatening, illegal, or harmful</li>
          <li>Use the app for commercial solicitation, advertising, or spam</li>
          <li>Attempt to access, scrape, or interfere with other users' data</li>
          <li>Use the app in any way that violates applicable law</li>
        </ul>

        <hr className="legal-divider" />

        <h2>5. Your Content</h2>
        <p>Photos and text you upload remain yours. By uploading them you grant Sapph a non-exclusive licence to display them to other users of the app for the purpose of operating the service. This licence ends when you delete your account or remove the content.</p>

        <hr className="legal-divider" />

        <h2>6. Termination</h2>
        <p>We may suspend or permanently delete accounts that breach these Terms without notice. You may delete your own account at any time from the Profile tab in the app.</p>

        <hr className="legal-divider" />

        <h2>7. Liability</h2>
        <p>Sapph is provided as-is. We do not guarantee uninterrupted availability. During the prototype phase we exclude all liability to the maximum extent permitted by law.</p>

        <hr className="legal-divider" />

        <h2>8. Governing Law</h2>
        <p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

        <hr className="legal-divider" />

        <h2>9. Changes to These Terms</h2>
        <p>We may update these Terms from time to time. We will notify you of significant changes. Continued use of the app after changes constitutes acceptance.</p>

        <hr className="legal-divider" />

        <h2>10. Contact</h2>
        <p><a href="mailto:legal@sapph.app">legal@sapph.app</a></p>
      </div>
    </div>
  )
}
