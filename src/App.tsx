import { Routes, Route } from 'react-router'
import { ProfilePage } from './pages/ProfilePage'
import { EventRoomPage } from './pages/EventRoomPage'
import { LoginMockPage } from './pages/LoginMockPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProfilePage />} />
      <Route path="/p/:userId" element={<ProfilePage />} />
      <Route path="/event/:eventId" element={<EventRoomPage />} />
      <Route path="/login" element={<LoginMockPage />} />
    </Routes>
  )
}
