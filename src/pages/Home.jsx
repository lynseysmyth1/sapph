import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">Sapph</h1>
        <button type="button" className="home-signout" onClick={handleSignOut}>
          Sign out
        </button>
      </header>
      <main className="home-main">
        <p className="home-welcome">
          Welcome{user?.email ? `, ${user.email}` : ''}.
        </p>
        <p className="home-placeholder">
          Your app flow continues here — discovery, profiles, messages, and more will be built next.
        </p>
      </main>
    </div>
  )
}
