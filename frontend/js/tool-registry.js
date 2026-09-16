export const TOOL_CATEGORIES = Object.freeze({
  AI: 'AI & Models',
  SEARCH: 'Search & Knowledge',
  VISION: 'Vision & OCR',
  SPEECH: 'Speech & Voice',
  PRODUCTIVITY: 'Productivity',
  EDUCATION: 'Education',
  STORAGE: 'Storage',
  ANALYTICS: 'Analytics',
});

export const toolRegistry = Object.freeze([
  { id: 'ai-teacher', name: 'AI Teacher', description: 'Personal tutoring and explanations at your pace.', category: TOOL_CATEGORIES.AI, provider: 'internal', status: 'available', configurable: true },
  { id: 'web-search', name: 'Web Search', description: 'Bring trusted sources into study sessions.', category: TOOL_CATEGORIES.SEARCH, provider: 'external', status: 'planned', configurable: true },
  { id: 'ocr', name: 'Document OCR', description: 'Turn scans and handwritten notes into searchable text.', category: TOOL_CATEGORIES.VISION, provider: 'external', status: 'planned', configurable: true },
  { id: 'calendar', name: 'Calendar', description: 'Sync study blocks and assignment deadlines.', category: TOOL_CATEGORIES.PRODUCTIVITY, provider: 'external', status: 'planned', configurable: true },
  { id: 'voice', name: 'Voice Study Mode', description: 'Practice with speech-to-text and text-to-speech.', category: TOOL_CATEGORIES.SPEECH, provider: 'external', status: 'planned', configurable: true },
  { id: 'supabase-storage', name: 'Supabase Storage', description: 'Store notes, documents, and learning materials securely.', category: TOOL_CATEGORIES.STORAGE, provider: 'supabase', status: 'available', configurable: true },
  { id: 'learning-analytics', name: 'Learning Analytics', description: 'Collect privacy-conscious study insights and trends.', category: TOOL_CATEGORIES.ANALYTICS, provider: 'internal', status: 'available', configurable: true },
]);

export const getToolById = (id) => toolRegistry.find((tool) => tool.id === id);