import { Routes, Route } from 'react-router'
import { AuthProvider, useAuth } from './context/AuthContext'
import { EventProvider } from './context/EventContext'
import { LandingPage } from './pages/LandingPage'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { ProfileEditPage } from './pages/ProfileEditPage'
import { EventListPage } from './pages/EventListPage'
import { EventCreatePage } from './pages/EventCreatePage'
import { EventRoomPage } from './pages/EventRoomPage'
import { EventEditPage } from './pages/EventEditPage'

function RootPage() {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <HomePage /> : <LandingPage />
}

export default function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <Routes>
          <Route path="/" element={<RootPage />} />
          <Route path="/me" element={<ProfilePage />} />
          <Route path="/me/edit" element={<ProfileEditPage />} />
          <Route path="/p/:userId" element={<ProfilePage />} />
          <Route path="/events" element={<EventListPage />} />
          <Route path="/events/new" element={<EventCreatePage />} />
          <Route path="/event/:eventId" element={<EventRoomPage />} />
          <Route path="/event/:eventId/edit" element={<EventEditPage />} />
        </Routes>
      </EventProvider>
    </AuthProvider>
  )
}
