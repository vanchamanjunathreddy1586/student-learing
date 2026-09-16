import test from 'node:test';
import assert from 'node:assert/strict';

import { getProviderMetadata, PROVIDER_REGISTRY } from '../server/provider-registry.js';

test('provider registry exposes demo and configurable providers without exposing secrets', () => {
  assert.ok(PROVIDER_REGISTRY.length >= 2);
  const demo = getProviderMetadata('demo');
  assert.equal(demo.name, 'Smart Learning demo');
  assert.ok(Array.isArray(demo.capabilities));
  assert.equal(demo.requiresApiKey, false);
  assert.equal(demo.category, 'demo');
});

test('tool registry keeps the future extension model intact', async () => {
  const { toolRegistry } = await import('../frontend/js/tool-registry.js');
  assert.ok(toolRegistry.some((tool) => tool.id === 'ai-teacher'));
  assert.ok(toolRegistry.some((tool) => tool.id === 'web-search'));
});
