import { createContext, useContext } from 'react';
import { usePeople as usePeopleHook } from '@/hooks/usePeople';

const PeopleContext = createContext(null);

export function PeopleProvider({ children }) {
  const people = usePeopleHook();
  return <PeopleContext.Provider value={people}>{children}</PeopleContext.Provider>;
}

export function usePeople() {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error('usePeople must be used within PeopleProvider');
  return ctx;
}
