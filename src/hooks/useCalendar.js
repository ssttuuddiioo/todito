import { useState, useEffect } from 'react';
import { useOpportunities } from './useOpportunities';
import {
  generateCalendarEvents,
  getUpcomingDeadlines,
  getWeekView,
  groupEventsByDate,
} from '@/lib/calendar';

/**
 * Hook for calendar functionality
 * @returns {Object} Calendar data and utilities
 */
export function useCalendar() {
  const { opportunities } = useOpportunities();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  useEffect(() => {
    if (opportunities) {
      const calendarEvents = generateCalendarEvents(opportunities);
      const upcoming = getUpcomingDeadlines(opportunities, 7);
      
      setEvents(calendarEvents);
      setUpcomingDeadlines(upcoming);
    }
  }, [opportunities]);

  const weekView = getWeekView(currentDate);
  const groupedEvents = groupEventsByDate(events);

  const goToNextWeek = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const goToPrevWeek = () => {
    setCurrentDate((prev) => {
      const prevDate = new Date(prev);
      prevDate.setDate(prevDate.getDate() - 7);
      return prevDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return {
    events,
    upcomingDeadlines,
    weekView,
    groupedEvents,
    currentDate,
    goToNextWeek,
    goToPrevWeek,
    goToToday,
  };
}

