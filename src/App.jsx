import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Splash from './pages/Splash'
import SignIn from './pages/SignIn'

/* Lazy-load heavy routes so initial TestFlight load is minimal (Splash + SignIn stay eager for sheet) */
const Landing = lazy(() => import('./pages/Landing'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Home = lazy(() => import('./pages/Home'))
const Profile = lazy(() => import('./pages/Profile'))
const PreviewProfile = lazy(() => import('./pages/PreviewProfile'))
const AgeRangePreferences = lazy(() => import('./pages/preferences/AgeRangePreferences'))
const DistancePreferences = lazy(() => import('./pages/preferences/DistancePreferences'))
const GenderPreferences = lazy(() => import('./pages/preferences/GenderPreferences'))
const ConnectionGoalsPreferences = lazy(() => import('./pages/preferences/ConnectionGoalsPreferences'))
const RelationshipStylePreferences = lazy(() => import('./pages/preferences/RelationshipStylePreferences'))
const RelationshipGoalsPreferences = lazy(() => import('./pages/preferences/RelationshipGoalsPreferences'))
const InterestsPreferences = lazy(() => import('./pages/preferences/InterestsPreferences'))
const FamilyPlansPreferences = lazy(() => import('./pages/preferences/FamilyPlansPreferences'))
const Likes = lazy(() => import('./pages/Likes'))
const Messages = lazy(() => import('./pages/Messages'))
const Chat = lazy(() => import('./pages/Chat'))
const TestFirebase = lazy(() => import('./pages/TestFirebase'))

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

function PageLoader() {
  return <div className="app-loading">Loading…</div>
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  )
}
