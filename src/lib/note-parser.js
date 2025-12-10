import { isAnthropicAvailable } from './anthropic';

const SYSTEM_PROMPT = `You are a helpful assistant that extracts structured data from notes for a project management and CRM application called Todito.

The application manages:
- Tasks: Have title, subtitle (extra details), project_id (optional), status (todo/in_progress/done), assignee, due_date, priority (high/medium/low), is_mine (boolean - true if it's the user's own task), energy (type of work), pomodoro_count (estimated time)
- Projects: Have name, client, status (in_progress/review/complete), phase (e.g. Discovery, Development, Review, Complete), start_date, deadline, next_milestone, notes, milestones array
- Opportunities: Have name, contact, value (number), stage (lead/proposal/negotiation/won/lost), next_action, due_date, notes
- Contacts: Have name, company, email, phone, notes
- Time Entries: Have project_id, hours (number), notes, date

Extract information from the user's notes and return a JSON object with the following structure:
{
  "tasks": [
    {
      "title": "string (keep short, max 60 chars - main action)",
      "subtitle": "string (optional, additional context/details from the notes)",
      "project_name": "string (optional, if project is mentioned)",
      "status": "todo|in_progress|done",
      "due_date": "YYYY-MM-DD (optional)",
      "priority": "high|medium|low (detect from emoji 🔴=high, 🟡=medium, 🟢=low, or words like 'High', 'urgent', 'critical' = high)",
      "is_mine": "boolean (true if under 'My Action Items', false if under 'Team Action Items' or assigned to someone else)",
      "assignee": "string (optional, who is responsible)",
      "energy": "leave empty string '' - user will categorize",
      "pomodoro_count": "leave as 0 - user will set difficulty",
    }
  ],
  "projects": [
    {
      "name": "string",
      "client": "string (optional)",
      "status": "in_progress|review|complete",
      "phase": "string (e.g. Discovery, Development, Review, Complete)",
      "start_date": "YYYY-MM-DD (optional)",
      "deadline": "YYYY-MM-DD (optional)",
      "next_milestone": "string (optional)",
      "notes": "string (optional)",
      "milestones": [
        {
          "name": "string",
          "date": "YYYY-MM-DD",
          "completed": "boolean"
        }
      ]
    }
  ],
  "project_updates": [
    {
      "project_name": "string (must match existing project)",
      "status": "in_progress|review|complete (optional)",
      "phase": "string (optional)",
      "deadline": "YYYY-MM-DD (optional)",
      "next_milestone": "string (optional)",
      "notes": "string (optional)",
      "milestones": [
        {
          "name": "string",
          "date": "YYYY-MM-DD",
          "completed": "boolean"
        }
      ]
    }
  ],
  "opportunities": [
    {
      "name": "string",
      "contact": "string (optional)",
      "value": "number (optional)",
      "stage": "lead|proposal|negotiation|won|lost",
      "next_action": "string (optional)",
      "due_date": "YYYY-MM-DD (optional)",
      "notes": "string (optional)"
    }
  ],
  "contacts": [
    {
      "name": "string",
      "company": "string (optional)",
      "email": "string (optional)",
      "phone": "string (optional)",
      "notes": "string (optional)"
    }
  ],
  "time_entries": [
    {
      "project_name": "string (if project is mentioned)",
      "hours": "number",
      "notes": "string",
      "date": "YYYY-MM-DD (defaults to today if not specified)"
    }
  ]
}

Rules:
- Only extract information that is clearly stated in the notes
- If a date is mentioned but no year, assume current year (2025 if year is 2026, use 2026)
- For tasks, if a project is mentioned, include project_name so it can be linked later
- For project_updates, only include if the note mentions updating an existing project
- For new projects, use the "projects" array
- Return empty arrays if no items of that type are found
- Be conservative - only extract what is clearly stated
- Detect priority from: 🔴 or "High" or "urgent" = high, 🟡 or "Medium" = medium, 🟢 or "Low" = low
- If notes have "My Action Items" section, those tasks have is_mine=true
- If notes have "Team Action Items" section, those tasks have is_mine=false
- Extract milestones from "Milestones & Key Dates" sections or similar
- Detect project phase from context (e.g. "Phase 1 – Looks Like", "kickoff", "development")
- For task titles: Keep them short and actionable (max 60 chars). Put extra details in subtitle
- For energy: Always leave as empty string '' - user will categorize manually
- For pomodoro_count: Always set to 0 - user will set difficulty/time manually
`;


export async function parseNotesWithAI(noteText) {
  // In production, serverless function handles auth
  // In development, local proxy handles it

  if (!noteText || noteText.trim().length === 0) {
    return getEmptyResult();
  }

  try {
    // Use Vercel serverless function in production, local proxy in development
    const isProduction = import.meta.env.PROD;
    const apiUrl = isProduction 
      ? '/api/anthropic/messages'  // Vercel serverless function
      : (import.meta.env.VITE_PROXY_URL || 'http://localhost:3001') + '/api/anthropic/messages';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Extract structured data from these notes:\n\n${noteText}`,
          },
        ],
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

    const text = content.text;
    
    // Check if AI says there's no data to extract
    if (text.toLowerCase().includes('not enough information') || 
        text.toLowerCase().includes('no structured data') ||
        text.toLowerCase().includes('cannot generate') ||
        text.toLowerCase().includes('would be empty')) {
      console.log('AI returned no extractable data, returning empty result');
      return getEmptyResult();
    }
    
    // Try to extract JSON from the response
    let jsonText = extractJSON(text);

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', jsonText);
      // If JSON parsing fails, check if it's because there's no JSON at all
      if (!jsonText.includes('{') || !jsonText.includes('}')) {
        console.log('No JSON found in response, returning empty result');
        return getEmptyResult();
      }
      throw new Error('Invalid JSON response from AI. Please try again.');
    }
    
    return normalizeParsedResult(parsed);
  } catch (error) {
    console.error('Error parsing notes with AI:', error);
    if (error.message?.includes('API key')) {
      throw new Error('Anthropic API key not configured. Please add VITE_ANTHROPIC_API_KEY to your .env.local file.');
    }
    throw new Error(`Failed to parse notes: ${error.message}`);
  }
}

export function parseNotesWithPatterns(noteText) {
  if (!noteText || noteText.trim().length === 0) {
    return getEmptyResult();
  }

  const result = getEmptyResult();
  const lines = noteText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Track context for is_mine
  let currentSection = null;
  
  // Detect section headers
  const myActionItemsPattern = /my\s+action\s+items/i;
  const teamActionItemsPattern = /team\s+action\s+items/i;

  // Simple pattern matching for tasks (lines starting with - or * or checkbox)
  const taskPattern = /^[-*•]\s*\[?\s*[xX ]?\s*\]?\s*\*{0,2}(.+?)\*{0,2}(?:\s*\(due:\s*([\d\/-]+)\))?$/i;
  const numberedTaskPattern = /^\d+[.)]\s*\[?\s*[xX ]?\s*\]?\s*(.+?)(?:\s*\(due:\s*([\d\/-]+)\))?$/i;

  // Priority detection patterns
  const highPriorityPattern = /🔴|high|urgent|critical/i;
  const mediumPriorityPattern = /🟡|medium/i;
  const lowPriorityPattern = /🟢|low/i;

  for (const line of lines) {
    // Check for section changes
    if (myActionItemsPattern.test(line)) {
      currentSection = 'mine';
      continue;
    }
    if (teamActionItemsPattern.test(line)) {
      currentSection = 'team';
      continue;
    }

    let match = line.match(taskPattern) || line.match(numberedTaskPattern);
    if (match) {
      const title = match[1].trim().replace(/\*{1,2}/g, ''); // Remove bold markers
      const dueDate = match[2] ? parseDate(match[2]) : null;
      
      // Detect priority from line content (default to none)
      let priority = '';
      if (highPriorityPattern.test(line)) priority = 'high';
      else if (mediumPriorityPattern.test(line)) priority = 'medium';
      else if (lowPriorityPattern.test(line)) priority = 'low';
      
      // Extract deadline from content if present
      let extractedDueDate = dueDate;
      const deadlineMatch = line.match(/deadline[:\s]*\*{0,2}([\d\-]+)\*{0,2}/i);
      if (deadlineMatch) {
        extractedDueDate = parseDate(deadlineMatch[1]);
      }
      
      result.tasks.push({
        title,
        subtitle: null,
        project_name: null,
        status: 'todo',
        due_date: extractedDueDate,
        priority,
        is_mine: currentSection === 'team' ? false : true, // Default to mine unless in team section
        assignee: currentSection === 'team' ? 'Team' : 'Me',
        energy: '', // User must categorize
        pomodoro_count: 0, // User must add difficulty
      });
    }
  }

  return result;
}

function extractJSON(text) {
  let jsonText = text.trim();
  
  // Remove markdown code blocks if present
  if (jsonText.includes('```json')) {
    const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
  }
  if (jsonText.includes('```')) {
    const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
  }
  
  // Find JSON object in text (starts with { and ends with })
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  // If no JSON found, return original text (will fail parsing with helpful error)
  return jsonText;
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

function normalizeParsedResult(parsed) {
  // Ensure all arrays exist and have correct structure
  return {
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    project_updates: Array.isArray(parsed.project_updates) ? parsed.project_updates : [],
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
    contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
    time_entries: Array.isArray(parsed.time_entries) ? parsed.time_entries : [],
  };
}

function parseDate(dateString) {
  // Simple date parsing - try to convert common formats to YYYY-MM-DD
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

