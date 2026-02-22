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
const SexPreferencePreferences = lazy(() => import('./pages/preferences/SexPreferencePreferences'))
const RelationshipStylePreferences = lazy(() => import('./pages/preferences/RelationshipStylePreferences'))
const RelationshipGoalsPreferences = lazy(() => import('./pages/preferences/RelationshipGoalsPreferences'))
const InterestsPreferences = lazy(() => import('./pages/preferences/InterestsPreferences'))
const FamilyPlansPreferences = lazy(() => import('./pages/preferences/FamilyPlansPreferences'))
const Likes = lazy(() => import('./pages/Likes'))
const Messages = lazy(() => import('./pages/Messages'))
const Chat = lazy(() => import('./pages/Chat'))
const TestFirebase = lazy(() => import('./pages/TestFirebase'))

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth()

  if (authLoading) return <PageLoader />
  if (!user) return <Navigate to="/signin" replace />

  return children
}

/** Single source of truth for initial routing decisions */
function SplashOrRedirect() {
  const { user, authLoading, profile, profileLoading } = useAuth()

  // Wait for Firebase auth check to complete
  if (authLoading) return <PageLoader />

  // Not authenticated → show splash
  if (!user) return <Splash />

  // Authenticated but profile fetch still in flight → wait
  if (profileLoading) return <PageLoader />

  // Profile loaded and incomplete → onboarding
  if (!profile || profile.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />
  }

  // Profile complete → home
  return <Navigate to="/home" replace />
}

function SignInOrRedirect() {
  const { user, authLoading } = useAuth()
  if (!authLoading && user) return <Navigate to="/home" replace />
  return <SignIn /> 
}

function PageLoader() {
  return (
    <div className="app-loading">
      <div className="app-loading-brand">
        <div className="app-loading-logo">S</div>
        <div className="app-loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  )
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
        path="/preferences/sex-preference"
        element={
          <ProtectedRoute>
            <SexPreferencePreferences />
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
