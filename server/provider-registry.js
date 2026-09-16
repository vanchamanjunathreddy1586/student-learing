export const PROVIDER_REGISTRY = Object.freeze([
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai',
    model: 'gpt-4o-mini',
    available: true,
    capabilities: ['chat', 'explain', 'quiz', 'planner', 'vision'],
    speed: 'fast',
    context_window: '128k',
    requiresApiKey: true,
    configSchema: {
      apiKey: { type: 'string', secret: true, required: false, env: 'OPENAI_API_KEY' },
      model: { type: 'string', required: false, default: 'gpt-4o-mini' },
      temperature: { type: 'number', required: false, default: 0.7 },
    },
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'ai',
    model: 'gemini-1.5-flash',
    available: true,
    capabilities: ['chat', 'explain', 'vision', 'quiz'],
    speed: 'fast',
    context_window: '1m',
    requiresApiKey: true,
    configSchema: {
      apiKey: { type: 'string', secret: true, required: false, env: 'GEMINI_API_KEY' },
      model: { type: 'string', required: false, default: 'gemini-1.5-flash' },
    },
  },
  {
    id: 'ollama',
    name: 'Ollama',
    category: 'local-ai',
    model: 'llama3.2',
    available: true,
    capabilities: ['chat', 'explain', 'planner'],
    speed: 'local',
    context_window: '128k',
    requiresApiKey: false,
    configSchema: {
      baseUrl: { type: 'string', required: false, default: 'http://localhost:11434', env: 'OLLAMA_BASE_URL' },
      model: { type: 'string', required: false, default: 'llama3.2' },
    },
  },
]);

export const getProviderMetadata = (providerId) =>
  PROVIDER_REGISTRY.find((provider) => provider.id === providerId) || PROVIDER_REGISTRY[0];

export const getAvailableProviders = () =>
  PROVIDER_REGISTRY.filter((provider) => provider.available).map((provider) => ({
    ...provider,
    configSchema: provider.configSchema ? Object.fromEntries(Object.entries(provider.configSchema).map(([key, meta]) => [key, { ...meta }])) : {},
  }));

export const createProviderDescriptor = (providerId, overrides = {}) => ({
  ...getProviderMetadata(providerId),
  ...overrides,
});
