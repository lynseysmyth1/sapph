import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Landing.css'

export default function Landing() {
  const { user } = useAuth()

  if (user) {
    return (
      <div className="landing">
        <div className="landing-content">
          <h1 className="landing-title">Sapph</h1>
          <p className="landing-tagline">Dating App for Women</p>
          <Link to="/home" className="landing-enter">
            Enter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="landing">
      <div className="landing-content">
        <h1 className="landing-title">Sapph</h1>
        <p className="landing-tagline">Dating App for Women</p>
        <Link to="/signin" className="landing-enter">
          Enter
        </Link>
      </div>
    </div>
  )
}
