import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Splash from './pages/Splash'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Likes from './pages/Likes'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import TestFirebase from './pages/TestFirebase'

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <div className="app-loading">Loading…</div>
  if (!user) return <Navigate to="/signin" replace />

  // New user or incomplete profile → onboarding
  if (user && !profile?.onboarding_completed && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/enter" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/test-firebase" element={<TestFirebase />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/likes"
        element={
          <ProtectedRoute>
            <Likes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:chatId"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
