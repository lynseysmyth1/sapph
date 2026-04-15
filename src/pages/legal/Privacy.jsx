import { useNavigate } from 'react-router-dom'
import './Legal.css'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="legal-page">
      <div className="legal-header">
        <button className="legal-back" onClick={() => navigate(-1)}>‹ Back</button>
      </div>
      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: February 2026</p>

        <div className="legal-prototype-banner">
          <strong>Prototype notice:</strong> This is a prototype Privacy Policy for testing purposes only. A legally reviewed policy will be published before public launch.
        </div>

        <h2>1. Who We Are</h2>
        <p>Sapph is a dating and social connection app for women. For data enquiries, contact: <a href="mailto:legal@sapph.app">legal@sapph.app</a></p>

        <hr className="legal-divider" />

        <h2>2. What Data We Collect</h2>
        <p>When you create a profile, we collect:</p>
        <ul>
          <li><strong>Basic information:</strong> name, date of birth, photos, bio, hometown</li>
          <li><strong>Location:</strong> approximate GPS coordinates (only when you grant permission)</li>
          <li>
            <strong>Identity information (special category data under GDPR Article 9):</strong>
            <ul>
              <li>Gender identity and expression</li>
              <li>Sexual identity and sexual preference</li>
              <li>Political alignment</li>
            </ul>
          </li>
          <li><strong>Other profile data:</strong> relationship goals, family plans, interests, vices, pets, zodiac sign, height, conversation starters</li>
        </ul>
        <p>We also collect usage data: likes, passes, matches, messages, and online presence.</p>

        <hr className="legal-divider" />

        <h2>3. Why We Collect It and Our Legal Basis</h2>
        <p>We collect your data to operate the Sapph service — to show you relevant profiles, enable matches, and facilitate conversations.</p>
        <p>For standard personal data: our legal basis is contract (Article 6(1)(b) GDPR) — we need this data to provide the service you signed up for.</p>
        <p>For special category data (gender identity, sexual identity, political alignment): our legal basis is your explicit consent (Article 9(2)(a) GDPR). You provide this data voluntarily during onboarding. You may choose to skip these questions at any time.</p>

        <hr className="legal-divider" />

        <h2>4. Who We Share Your Data With</h2>
        <p>We use the following third-party services to operate the app:</p>
        <ul>
          <li><strong>Google Firebase</strong> (Firestore, Authentication, Storage) — data is stored on Google's servers, encrypted at rest and in transit. Google acts as our data processor under Google's standard data processing terms.</li>
        </ul>
        <p>We do not sell your data to any third party.</p>

        <hr className="legal-divider" />

        <h2>5. How Long We Keep Your Data</h2>
        <p>We keep your data for as long as your account is active. If you delete your account, all of your data is permanently deleted immediately — including your profile, photos, likes, matches, and messages. There is no recovery period.</p>

        <hr className="legal-divider" />

        <h2>6. Your Rights</h2>
        <p>Under GDPR you have the right to:</p>
        <ul>
          <li>Access the data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Delete your data (use the Delete Account button in the app at any time)</li>
          <li>Withdraw consent at any time</li>
          <li>Lodge a complaint with the ICO at <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a></li>
        </ul>
        <p>To exercise any right other than deletion, contact: <a href="mailto:legal@sapph.app">legal@sapph.app</a></p>

        <hr className="legal-divider" />

        <h2>7. Cookies and Local Storage</h2>
        <p>See our <a href="/cookies">Cookies Policy</a>.</p>

        <hr className="legal-divider" />

        <h2>8. Changes to This Policy</h2>
        <p>We will notify you of significant changes. Continued use of the app after changes constitutes acceptance of the updated policy.</p>
      </div>
    </div>
  )
}
