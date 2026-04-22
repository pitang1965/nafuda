import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { MOCK_EVENTS_INITIAL, MY_USER_ID } from '../data/mockData'
import type { MockEvent } from '../data/mockData'

interface EventContextValue {
  events: MockEvent[]
  myEvents: MockEvent[]
  participatingEvents: MockEvent[]
  getEvent: (id: string) => MockEvent | undefined
  createEvent: (data: Omit<MockEvent, 'id' | 'participants' | 'createdBy'>) => MockEvent
  updateEvent: (id: string, data: Partial<Pick<MockEvent, 'name' | 'venue' | 'date'>>) => void
  deleteEvent: (id: string) => void
}

const EventContext = createContext<EventContextValue | null>(null)

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<MockEvent[]>(MOCK_EVENTS_INITIAL)

  const myEvents = events.filter((e) => e.createdBy === MY_USER_ID)
  const participatingEvents = events.filter(
    (e) => e.createdBy !== MY_USER_ID && e.participants.some((p) => p.id === MY_USER_ID)
  )

  function getEvent(id: string) {
    return events.find((e) => e.id === id)
  }

  function createEvent(data: Omit<MockEvent, 'id' | 'participants' | 'createdBy'>): MockEvent {
    const newEvent: MockEvent = {
      ...data,
      id: `event-${Date.now()}`,
      participants: [MOCK_EVENTS_INITIAL[0].participants[0]],
      createdBy: MY_USER_ID,
    }
    setEvents((prev) => [newEvent, ...prev])
    return newEvent
  }

  function updateEvent(id: string, data: Partial<Pick<MockEvent, 'name' | 'venue' | 'date'>>) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)))
  }

  function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <EventContext.Provider value={{ events, myEvents, participatingEvents, getEvent, createEvent, updateEvent, deleteEvent }}>
      {children}
    </EventContext.Provider>
  )
}

export function useEvents() {
  const ctx = useContext(EventContext)
  if (!ctx) throw new Error('useEvents must be used within EventProvider')
  return ctx
}
