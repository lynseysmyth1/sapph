import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Splash from './pages/Splash'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Profile from './pages/Profile'
import PreviewProfile from './pages/PreviewProfile'
import AgeRangePreferences from './pages/preferences/AgeRangePreferences'
import DistancePreferences from './pages/preferences/DistancePreferences'
import GenderPreferences from './pages/preferences/GenderPreferences'
import ConnectionGoalsPreferences from './pages/preferences/ConnectionGoalsPreferences'
import RelationshipStylePreferences from './pages/preferences/RelationshipStylePreferences'
import RelationshipGoalsPreferences from './pages/preferences/RelationshipGoalsPreferences'
import InterestsPreferences from './pages/preferences/InterestsPreferences'
import FamilyPlansPreferences from './pages/preferences/FamilyPlansPreferences'
import Likes from './pages/Likes'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import TestFirebase from './pages/TestFirebase'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="app-loading">Loading…</div>
  if (!user) return <Navigate to="/signin" replace />

  return children
}

/** When user is already signed in, redirect to app (so WebView reliably leaves splash/signin) */
function SplashOrRedirect() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/home" replace />
  return <Splash />
}

function SignInOrRedirect() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/home" replace />
  return <SignIn /> 
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashOrRedirect />} />
      <Route path="/enter" element={<Landing />} />
      <Route path="/signin" element={<SignInOrRedirect />} />
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
        path="/preview-profile"
        element={
          <ProtectedRoute>
            <PreviewProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences/age-range"
        element={
          <ProtectedRoute>
            <AgeRangePreferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences/distance"
        element={
          <ProtectedRoute>
            <DistancePreferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences/gender"
        element={
          <ProtectedRoute>
            <GenderPreferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences/relationship-goals"
        element={
          <ProtectedRoute>
            <RelationshipGoalsPreferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences/connection-goals"
        element={
          <ProtectedRoute>
            <ConnectionGoalsPreferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences/relationship-style"
        element={
          <ProtectedRoute>
            <RelationshipStylePreferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences/interests"
        element={
          <ProtectedRoute>
            <InterestsPreferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences/family-plans"
        element={
          <ProtectedRoute>
            <FamilyPlansPreferences />
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
