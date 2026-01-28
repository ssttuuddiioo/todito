/**
 * Asana integration utilities
 * Provides OAuth URL building and field mapping for Todito <-> Asana sync
 */

const ASANA_AUTHORIZE_URL = 'https://app.asana.com/-/oauth_authorize';

/**
 * Build the OAuth authorization URL for Asana
 * @param {string} userId - The current user's ID (used as state for security)
 * @returns {string} The full OAuth authorization URL
 */
export function buildAsanaOAuthUrl(userId) {
  const clientId = import.meta.env.VITE_ASANA_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_ASANA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Asana OAuth not configured. Missing VITE_ASANA_CLIENT_ID or VITE_ASANA_REDIRECT_URI');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: userId,
    scope: 'default', // Default scope gives access to read/write tasks, projects, workspaces
  });

  return `${ASANA_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Check if Asana OAuth is configured
 * @returns {boolean}
 */
export function isAsanaConfigured() {
  return !!(import.meta.env.VITE_ASANA_CLIENT_ID && import.meta.env.VITE_ASANA_REDIRECT_URI);
}

/**
 * Map a Todito task to Asana task format
 * @param {Object} task - Todito task object
 * @returns {Object} Asana-compatible task object
 */
export function mapToditoTaskToAsana(task) {
  // Build notes from subtitle and description
  const noteParts = [];
  
  if (task.priority) {
    const priorityEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    }[task.priority] || '';
    noteParts.push(`Priority: ${priorityEmoji} ${task.priority.toUpperCase()}`);
  }

  if (task.energy) {
    const energyLabels = {
      deep_focus: '🧠 Deep Focus',
      communication: '💬 Communication',
      planning: '📐 Planning',
      admin: '📋 Admin',
    };
    noteParts.push(`Energy: ${energyLabels[task.energy] || task.energy}`);
  }

  if (task.pomodoro_count && task.pomodoro_count > 0) {
    const pomodoroDisplay = task.pomodoro_count >= 4 
      ? '🍇 Big task' 
      : '🍅'.repeat(task.pomodoro_count);
    noteParts.push(`Effort: ${pomodoroDisplay}`);
  }

  if (task.subtitle) {
    noteParts.push('', task.subtitle);
  }

  if (task.description) {
    noteParts.push('', task.description);
  }

  return {
    title: task.title,
    notes: noteParts.join('\n'),
    due_date: task.due_date || null,
    priority: task.priority || null,
    // Original task reference for tracking
    _todito_id: task.id,
  };
}

/**
 * Map multiple Todito tasks to Asana format
 * @param {Array} tasks - Array of Todito tasks
 * @returns {Array} Array of Asana-compatible tasks
 */
export function mapTasksForAsanaExport(tasks) {
  return tasks.map(mapToditoTaskToAsana);
}

/**
 * Get API base URL based on environment
 * @returns {string}
 */
export function getAsanaApiBaseUrl() {
  const isProduction = import.meta.env.PROD;
  return isProduction 
    ? '/api/asana' 
    : (import.meta.env.VITE_PROXY_URL || 'http://localhost:3001') + '/api/asana';
}

/**
 * Priority color mapping for display
 */
export const PRIORITY_DISPLAY = {
  high: { label: '🔴 High', color: 'text-red-600', bg: 'bg-red-50' },
  medium: { label: '🟡 Medium', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  low: { label: '🟢 Low', color: 'text-green-600', bg: 'bg-green-50' },
};

/**
 * Energy type display mapping
 */
export const ENERGY_DISPLAY = {
  deep_focus: { label: '🧠 Deep Focus', color: 'text-purple-600' },
  communication: { label: '💬 Communication', color: 'text-blue-600' },
  planning: { label: '📐 Planning', color: 'text-orange-600' },
  admin: { label: '📋 Admin', color: 'text-gray-600' },
};


