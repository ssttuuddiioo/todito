// ---------------------------------------------------------------------------
// Notes Parser — Structured + Freeform
//
// Two modes, auto-detected:
//   1. Structured (Granola recipe) → deterministic parse, no AI
//   2. Freeform (anything else)    → LLM normalizes to structured → same parse
// ---------------------------------------------------------------------------

const NORMALIZATION_PROMPT = `You are a task extraction assistant. You will receive raw notes from a meeting, voice memo, message, or other source. Your job is to extract actionable tasks and return them in this exact format:

Project: [project or client name, or ⚠️ Untagged if unclear]

- Task: [short action-oriented description, max 10 words, start with a verb]
  Category: [one of: Vendor, Design, Coordination, Procurement, On-site, Dev, Admin]
  Priority: [High if hard deadline or blocks other work, Medium if has a date or is important, Low otherwise]
  Due: [YYYY-MM-DD if a date is mentioned or can be inferred, otherwise TBD]
  Notes: [two to three sentences of context, sub-steps, and dependencies]
  Waiting on: [only if blocked — Person/Company — description, mentioned date context]

After all tasks for a project, if you identified a clear project scope or key milestones, add:

Scope: [1-3 sentence summary of the project's goal and deliverables]

Milestones:
- [YYYY-MM-DD] [milestone description]
- [YYYY-MM-DD] [milestone description]

Only include Scope and Milestones if the notes contain enough information to summarize them. Skip if the notes are purely about tasks.

Rules:
- Consolidate related actions into a single task. If multiple steps serve the same goal, combine them. Use the notes field for sub-steps. Aim for 8–12 tasks per meeting, not 20+.
- Only extract real tasks — not discussion points, opinions, calendar reminders, or background context.
- Quick actions under 2 minutes (a Slack message, a quick confirmation) should be folded into the notes of a related task, not their own card.
- Travel constraints or scheduling notes should not be tasks. Mention them in the notes of the relevant task.
- Default task owner is Pablo unless someone else is clearly assigned.
- Do not use markdown formatting — plain text only.
- If multiple projects are mentioned, group tasks under each project.
- If no actionable tasks exist in the input, return: "No tasks found."`;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the input looks like structured Granola-recipe format.
 * Heuristic: has at least one "- Task:" line AND at least one "Category:" line.
 */
export function isStructuredFormat(text) {
  if (!text || typeof text !== 'string') return false;
  return /^-\s*Task:\s*.+/m.test(text) && /^\s*Category:\s*.+/m.test(text);
}

// Valid categories (lowercase for matching)
const VALID_CATEGORIES = new Set([
  'vendor', 'design', 'coordination', 'procurement', 'on-site', 'onsite', 'dev', 'admin',
]);

// Normalize category string to app energy ID
function normalizeCategory(raw) {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  if (lower === 'on-site') return 'onsite';
  if (VALID_CATEGORIES.has(lower)) return lower;
  return '';
}

// Normalize priority string to app priority ID
function normalizePriority(raw) {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  if (lower === 'high' || lower === 'medium' || lower === 'low') return lower;
  return '';
}

// ---------------------------------------------------------------------------
// Deterministic structured parser
// ---------------------------------------------------------------------------

/**
 * Parse structured (Granola-recipe) text into the normalized app result shape.
 * Works as a single-pass line-by-line state machine.
 *
 * Task blocks:
 *   - Task: [text]
 *     Category: [Vendor|Design|Coordination|Procurement|On-site|Dev|Admin]
 *     Priority: [Low|Medium|High]
 *     Due: [YYYY-MM-DD|TBD]
 *     Notes: [text]
 *     Waiting on: [Person — desc, mentioned date]  (optional, repeatable)
 */
export function parseStructuredNotes(text) {
  if (!text || text.trim().length === 0) return getEmptyResult();

  const lines = text.split('\n');
  const tasks = [];
  const projectUpdates = []; // { project_name, scope, milestones }

  let currentProject = null;
  let currentTask = null;
  let currentScope = null;
  let parsingMilestones = false;
  let currentMilestones = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Skip blank lines
    if (trimmed.length === 0) continue;

    // --- Project header ---
    const projectMatch = trimmed.match(/^Project:\s*(.+)$/i);
    if (projectMatch) {
      flushTask();
      flushProjectUpdate();
      currentProject = projectMatch[1].trim();
      parsingMilestones = false;
      continue;
    }

    // --- Scope line ---
    const scopeMatch = trimmed.match(/^Scope:\s*(.+)$/i);
    if (scopeMatch) {
      flushTask();
      parsingMilestones = false;
      currentScope = scopeMatch[1].trim();
      continue;
    }

    // --- Milestones header ---
    if (/^Milestones:\s*$/i.test(trimmed)) {
      flushTask();
      parsingMilestones = true;
      continue;
    }

    // --- Milestone entry ---
    if (parsingMilestones) {
      const milestoneMatch = trimmed.match(/^-\s*\[?(\d{4}-\d{2}-\d{2})\]?\s+(.+)$/);
      if (milestoneMatch) {
        currentMilestones.push({
          date: milestoneMatch[1],
          title: milestoneMatch[2].trim(),
          completed: false,
        });
        continue;
      }
      // If not a milestone line, stop parsing milestones
      parsingMilestones = false;
    }

    // --- Task line ---
    const taskMatch = trimmed.match(/^-\s*Task:\s*(.+)$/i);
    if (taskMatch) {
      flushTask();
      currentTask = {
        title: taskMatch[1].trim(),
        subtitle: null,
        project_name: currentProject,
        status: 'todo',
        due_date: null,
        priority: '',
        is_mine: true,
        assignee: 'Pablo',
        energy: '',
        pomodoro_count: 0,
        waiting_on: [],
      };
      continue;
    }

    // --- Fields inside a task block ---
    if (currentTask) {
      // Category
      const catMatch = trimmed.match(/^Category:\s*(.+)$/i);
      if (catMatch) {
        currentTask.energy = normalizeCategory(catMatch[1]);
        continue;
      }

      // Priority
      const prioMatch = trimmed.match(/^Priority:\s*(.+)$/i);
      if (prioMatch) {
        currentTask.priority = normalizePriority(prioMatch[1]);
        continue;
      }

      // Due
      const dueMatch = trimmed.match(/^Due:\s*(.+)$/i);
      if (dueMatch) {
        currentTask.due_date = parseGranolaDate(dueMatch[1]);
        continue;
      }

      // Notes
      const notesMatch = trimmed.match(/^Notes:\s*(.+)$/i);
      if (notesMatch) {
        const notesText = notesMatch[1].trim();
        currentTask.subtitle = notesText;

        // Check for owner patterns in notes
        const ownerMatch =
          notesText.match(/Owner:\s*(.+?)(?:\s*$|[,.])/i) ||
          notesText.match(/(.+?)\s+is\s+responsible\s+for\s+this/i);
        if (ownerMatch) {
          const owner = ownerMatch[1].trim();
          const isDefault =
            owner.toLowerCase() === 'pablo' || owner.toLowerCase() === 'me';
          if (!isDefault) {
            currentTask.assignee = owner;
            currentTask.is_mine = false;
          }
        }
        continue;
      }

      // Waiting on (task metadata — can appear multiple times)
      const woMatch = trimmed.match(/^Waiting\s+on:\s*(.+)$/i);
      if (woMatch) {
        const woEntry = parseWaitingOnEntry(woMatch[1]);
        if (woEntry) {
          currentTask.waiting_on.push(woEntry);
        }
        continue;
      }
    }

    // --- Legacy: standalone "Waiting On:" section header ---
    // Old format had a separate section. If we encounter it, just skip the header
    // and try to attach entries to the last task.
    if (/^Waiting\s+On\s*:\s*$/i.test(trimmed)) {
      continue;
    }

    // --- Legacy: standalone waiting-on entry (outside a task block) ---
    // Attach to the last task if possible
    if (!currentTask && tasks.length > 0) {
      const legacyWo = trimmed.match(
        /^-\s*(.+?)\s*[\u2014\u2013]\s*(.+)$|^-\s*(.+?)\s*--\s*(.+)$/
      );
      if (legacyWo) {
        const contact = (legacyWo[1] || legacyWo[3] || '').trim();
        const rest = (legacyWo[2] || legacyWo[4] || '').trim();
        const woEntry = parseWaitingOnEntry(`${contact} — ${rest}`);
        if (woEntry) {
          tasks[tasks.length - 1].waiting_on.push(woEntry);
        }
        continue;
      }
    }

    // Unrecognized line — skip
  }

  // Flush any remaining task and project update
  flushTask();
  flushProjectUpdate();

  function flushTask() {
    if (currentTask) {
      tasks.push(currentTask);
      currentTask = null;
    }
  }

  function flushProjectUpdate() {
    if (currentProject && (currentScope || currentMilestones.length > 0)) {
      projectUpdates.push({
        project_name: currentProject,
        scope: currentScope || null,
        milestones: currentMilestones.length > 0 ? [...currentMilestones] : [],
      });
    }
    currentScope = null;
    currentMilestones = [];
  }

  const result = getEmptyResult();
  result.tasks = tasks;
  result.project_updates = projectUpdates;
  return result;
}

// ---------------------------------------------------------------------------
// Parse a "Waiting on:" value into structured data
// Input: "Bould Design — updated CAD files, mentioned by end of week"
// ---------------------------------------------------------------------------

function parseWaitingOnEntry(raw) {
  if (!raw) return null;
  const text = raw.trim();

  // Split on em dash, en dash, or double hyphen
  const dashMatch = text.match(/^(.+?)\s*[\u2014\u2013]\s*(.+)$/) ||
                    text.match(/^(.+?)\s*--\s*(.+)$/);

  if (!dashMatch) {
    // No delimiter — treat entire string as contact with no description
    return { contact: text, description: '', date_context: null };
  }

  const contact = dashMatch[1].trim();
  let afterDash = dashMatch[2].trim();
  let description = afterDash;
  let dateContext = null;

  // Extract "mentioned [date context]" or "requested [date context]"
  const mentionedMatch = afterDash.match(/,?\s*(?:mentioned|requested)\s+(.+)$/i);
  if (mentionedMatch) {
    description = afterDash.slice(0, mentionedMatch.index).trim();
    dateContext = mentionedMatch[1].trim();
  }

  return { contact, description, date_context: dateContext };
}

// ---------------------------------------------------------------------------
// LLM normalization (freeform → structured)
// ---------------------------------------------------------------------------

/**
 * Send freeform text through Claude to normalize it into structured format.
 * Returns the structured text (not JSON) which should then be passed to
 * parseStructuredNotes().
 */
export async function normalizeWithLLM(noteText) {
  if (!noteText || noteText.trim().length === 0) {
    return null;
  }

  const isProduction = import.meta.env.PROD;
  const apiUrl = isProduction
    ? '/api/anthropic/messages'
    : (import.meta.env.VITE_PROXY_URL || 'http://localhost:3001') +
      '/api/anthropic/messages';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: NORMALIZATION_PROMPT,
      messages: [
        {
          role: 'user',
          content: noteText,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    const errorMessage =
      errorData.error ||
      errorData.details?.message ||
      `HTTP error! status: ${response.status}`;
    throw new Error(`${response.status} ${errorMessage}`);
  }

  const message = await response.json();
  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic API');
  }

  return content.text;
}

// ---------------------------------------------------------------------------
// Project creation parser (freeform → project fields + tasks)
// ---------------------------------------------------------------------------

const PROJECT_CREATION_PROMPT = `You are a project setup assistant. You will receive raw notes about a new project — could be meeting notes, a brief, a message, or a brain dump. Extract all useful project details and return them as JSON.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "name": "Project name if mentioned, otherwise empty string",
  "client": "Client or company name if mentioned, otherwise empty string",
  "phase": "Current phase if mentioned (e.g., Pre-production, Design, Development), otherwise empty string",
  "deadline": "YYYY-MM-DD if a deadline is mentioned, otherwise empty string",
  "budget": null or number (e.g., 5000),
  "hours_estimate": null or number (e.g., 40),
  "scope": "1-3 sentence summary of the project goal and deliverables, or empty string",
  "notes": "Any remaining context, background info, or details that don't fit elsewhere",
  "milestones": [
    { "title": "Milestone description", "date": "YYYY-MM-DD or empty string", "completed": false }
  ],
  "tasks": [
    { "title": "Short action-oriented task (start with verb)", "priority": "high|medium|low", "due_date": "YYYY-MM-DD or null", "subtitle": "Brief context or notes" }
  ],
  "links": [
    { "title": "Link label", "url": "https://..." }
  ]
}

Rules:
- Extract as much as you can. Leave fields empty/null if not mentioned.
- Tasks should be actionable — start with a verb, max 10 words.
- Consolidate related actions into single tasks. Aim for quality over quantity.
- Budget should be a number only (no currency symbols).
- Links: extract any URLs mentioned with a descriptive title.
- If no useful information can be extracted, return the JSON with all empty/null fields.`;

/**
 * Parse freeform notes into project creation fields using LLM.
 * Returns a JSON object with project fields, tasks, milestones, and links.
 */
export async function parseForNewProject(noteText) {
  if (!noteText || noteText.trim().length === 0) return null;

  const isProduction = import.meta.env.PROD;
  const apiUrl = isProduction
    ? '/api/anthropic/messages'
    : (import.meta.env.VITE_PROXY_URL || 'http://localhost:3001') +
      '/api/anthropic/messages';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: PROJECT_CREATION_PROMPT,
      messages: [{ role: 'user', content: noteText }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || errorData.details?.message || `HTTP error! status: ${response.status}`;
    throw new Error(`${response.status} ${errorMessage}`);
  }

  const message = await response.json();
  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic API');
  }

  // Parse JSON from response (strip any markdown fences if present)
  let text = content.text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseGranolaDate(dateStr) {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (trimmed.toUpperCase() === 'TBD' || trimmed === '') return null;
  // ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Fallback: attempt JS Date parsing
  try {
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function getEmptyResult() {
  return {
    tasks: [],
    projects: [],
    project_updates: [],
    opportunities: [],
    contacts: [],
    time_entries: [],
  };
}
