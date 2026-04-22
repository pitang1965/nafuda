import { Routes, Route } from 'react-router'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LandingPage } from './pages/LandingPage'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { ProfileEditPage } from './pages/ProfileEditPage'
import { EventRoomPage } from './pages/EventRoomPage'

function RootPage() {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <HomePage /> : <LandingPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/me" element={<ProfilePage />} />
        <Route path="/me/edit" element={<ProfileEditPage />} />
        <Route path="/p/:userId" element={<ProfilePage />} />
        <Route path="/event/:eventId" element={<EventRoomPage />} />
      </Routes>
    </AuthProvider>
  )
}
