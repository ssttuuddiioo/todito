import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

/**
 * Generate calendar events from opportunities
 * @param {Array} opportunities - Array of opportunity objects
 * @returns {Array} Calendar events
 */
export function generateCalendarEvents(opportunities) {
  if (!opportunities || !Array.isArray(opportunities)) return [];
  
  return opportunities
    .filter(opp => opp.deadline)
    .map(opp => ({
      id: opp.id,
      title: opp.title,
      date: new Date(opp.deadline),
      type: 'opportunity',
      status: opp.status,
      value: opp.estimated_value,
    }));
}

/**
 * Get upcoming deadlines within specified days
 * @param {Array} opportunities - Array of opportunity objects
 * @param {number} days - Number of days to look ahead
 * @returns {Array} Upcoming opportunities
 */
export function getUpcomingDeadlines(opportunities, days = 7) {
  if (!opportunities || !Array.isArray(opportunities)) return [];
  
  const now = new Date();
  const futureDate = addDays(now, days);
  
  return opportunities
    .filter(opp => {
      if (!opp.deadline) return false;
      const deadline = new Date(opp.deadline);
      return deadline >= now && deadline <= futureDate;
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

/**
 * Get week view data
 * @param {Date} date - Reference date
 * @returns {Object} Week view data
 */
export function getWeekView(date = new Date()) {
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }
  
  return {
    weekStart,
    weekEnd,
    days,
    formattedRange: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`,
  };
}

/**
 * Group events by date
 * @param {Array} events - Array of calendar events
 * @returns {Object} Events grouped by date
 */
export function groupEventsByDate(events) {
  if (!events || !Array.isArray(events)) return {};
  
  return events.reduce((acc, event) => {
    const dateKey = format(event.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {});
}



