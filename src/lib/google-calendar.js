/**
 * Google Calendar API integration utilities
 * 
 * Setup instructions:
 * 1. Enable Google Calendar API in Google Cloud Console
 * 2. Configure OAuth consent screen
 * 3. Add calendar.readonly and calendar.events scopes
 * 4. Supabase will handle the OAuth flow
 */

/**
 * Get today's calendar events
 * Note: This is a placeholder. Full implementation requires:
 * - Google Calendar API enabled in Supabase
 * - Access token from OAuth flow
 * - Calendar API calls with proper authentication
 */
export async function getTodaysMeetings(accessToken) {
  if (!accessToken) {
    console.warn('No access token available for Google Calendar');
    return [];
  }

  try {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin: now.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
        }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch calendar events');
    }

    const data = await response.json();
    
    return data.items?.map((event) => ({
      id: event.id,
      title: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      description: event.description,
      location: event.location,
    })) || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

/**
 * Create a calendar event for a deadline
 */
export async function createCalendarEvent(accessToken, eventData) {
  if (!accessToken) {
    console.warn('No access token available for Google Calendar');
    return { error: 'No access token' };
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: eventData.title,
          description: eventData.description,
          start: {
            date: eventData.date,
          },
          end: {
            date: eventData.date,
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 60 }, // 1 hour before
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create calendar event');
    }

    const event = await response.json();
    return { data: event.id, error: null };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(accessToken, eventId, eventData) {
  if (!accessToken || !eventId) {
    return { error: 'Missing access token or event ID' };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: eventData.title,
          description: eventData.description,
          start: {
            date: eventData.date,
          },
          end: {
            date: eventData.date,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update calendar event');
    }

    return { error: null };
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return { error: error.message };
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(accessToken, eventId) {
  if (!accessToken || !eventId) {
    return { error: 'Missing access token or event ID' };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete calendar event');
    }

    return { error: null };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return { error: error.message };
  }
}

/**
 * Check if Google Calendar is connected
 * This checks if the user has granted calendar permissions
 */
export function isCalendarConnected(session) {
  // Check if session has the required calendar scope
  const scopes = session?.user?.app_metadata?.provider_token_scopes || [];
  return scopes.includes('https://www.googleapis.com/auth/calendar');
}



