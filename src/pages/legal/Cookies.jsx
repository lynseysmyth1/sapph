import { useNavigate } from 'react-router-dom'
import './Legal.css'

export default function Cookies() {
  const navigate = useNavigate()

  return (
    <div className="legal-page">
      <div className="legal-header">
        <button className="legal-back" onClick={() => navigate(-1)}>‹ Back</button>
      </div>
      <div className="legal-content">
        <h1>Cookies Policy</h1>
        <p className="legal-updated">Last updated: February 2026</p>

        <div className="legal-prototype-banner">
          <strong>Prototype notice:</strong> This is a prototype Cookies Policy for testing purposes only. A legally reviewed policy will be published before public launch.
        </div>

        <h2>1. What Are Cookies</h2>
        <p>Cookies are small files stored on your device by a website or app. Sapph is a web app and uses browser local storage and IndexedDB rather than traditional HTTP cookies.</p>

        <hr className="legal-divider" />

        <h2>2. What We Use</h2>
        <p><strong>Authentication token</strong> — stored in local storage by Firebase Authentication to keep you signed in between sessions. This is strictly necessary for the app to function. Without it you would be logged out every time you close the app.</p>
        <p><strong>Offline data cache</strong> — Firestore data is cached locally via IndexedDB to allow the app to work with a poor connection. This cache contains your profile data and recent messages. It is stored only on your device and is not transmitted to any third party.</p>

        <hr className="legal-divider" />

        <h2>3. Third-Party Services</h2>
        <p>Sapph uses Google Firebase to operate the app. Firebase may store authentication tokens or session identifiers in your browser's local storage as part of its authentication service. For more information see <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google's Privacy Policy</a>.</p>

        <hr className="legal-divider" />

        <h2>4. We Do Not Use Tracking or Advertising Cookies</h2>
        <p>Sapph does not use analytics, advertising, or third-party tracking cookies. We do not share browsing data with advertisers.</p>

        <hr className="legal-divider" />

        <h2>5. Your Choices</h2>
        <p>You can clear app storage at any time via your browser or device settings. Doing so will log you out of the app and remove any locally cached data. Your account and profile data stored on our servers will not be affected.</p>

        <hr className="legal-divider" />

        <h2>6. Contact</h2>
        <p>For any questions about how we use local storage or cookies, contact: <a href="mailto:legal@sapph.app">legal@sapph.app</a></p>
      </div>
    </div>
  )
}
