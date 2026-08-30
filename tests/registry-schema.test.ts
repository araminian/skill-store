import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { validateRegistryCatalog, validateStack } from '../src/stacks/schema-validator.js';

describe('Registry Schema Validation (CI Gatekeeper)', () => {
  it('validates the official registry/stacks.json against all schema rules', async () => {
    const stacksJsonPath = join(__dirname, '..', 'registry', 'stacks.json');
    const content = await readFile(stacksJsonPath, 'utf-8');
    const catalog = JSON.parse(content);

    const result = validateRegistryCatalog(catalog);

    if (!result.valid) {
      console.error('Schema validation errors in registry/stacks.json:', result.errors);
    }

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.skippedCount).toBe(0);
    expect(result.validatedStacks.length).toBeGreaterThan(5);

    // Verify all canonical IDs match category/name
    for (const stack of result.validatedStacks) {
      expect(stack.id).toMatch(/^[a-z0-9-]+(\/[a-z0-9-]+)+$/);
      expect(stack.id.startsWith(`${stack.category}/`)).toBe(true);
      expect(stack.skills.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid canonical IDs (e.g. uppercase, spaces, missing category)', () => {
    const invalidId1 = validateStack({
      id: 'Frontend/NextJS',
      name: 'Test',
      category: 'frontend',
      description: 'Desc',
      skills: [{ name: 's1' }],
    });
    expect(invalidId1.valid).toBe(false);
    expect(invalidId1.errors.some((e) => e.includes('Invalid canonical "id" format'))).toBe(true);

    const invalidId2 = validateStack({
      id: 'no-category',
      name: 'Test',
      category: 'general',
      description: 'Desc',
      skills: [{ name: 's1' }],
    });
    expect(invalidId2.valid).toBe(false);
    expect(invalidId2.errors.some((e) => e.includes('Invalid canonical "id" format'))).toBe(true);
  });

  it('rejects missing required fields (name, category, description, skills)', () => {
    const missingFields = validateStack({
      id: 'test/stack',
    });
    expect(missingFields.valid).toBe(false);
    expect(missingFields.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('rejects empty or malformed skills array', () => {
    const emptySkills = validateStack({
      id: 'test/stack',
      name: 'Test',
      category: 'test',
      description: 'Desc',
      skills: [],
    });
    expect(emptySkills.valid).toBe(false);
    expect(emptySkills.errors.some((e) => e.includes('"skills" must be a non-empty array'))).toBe(true);

    const malformedSkill = validateStack({
      id: 'test/stack',
      name: 'Test',
      category: 'test',
      description: 'Desc',
      skills: [{ noname: true }],
    });
    expect(malformedSkill.valid).toBe(false);
    expect(malformedSkill.errors.some((e) => e.includes('missing a valid string "name"'))).toBe(true);
  });

  it('detects duplicate stack IDs in catalog', () => {
    const duplicateCatalog = {
      version: 1,
      stacks: [
        {
          id: 'test/dup',
          name: 'First',
          category: 'test',
          description: 'Desc',
          skills: [{ name: 's1' }],
        },
        {
          id: 'test/dup',
          name: 'Second',
          category: 'test',
          description: 'Desc',
          skills: [{ name: 's2' }],
        },
      ],
    };

    const res = validateRegistryCatalog(duplicateCatalog);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Duplicate stack id'))).toBe(true);
    expect(res.validatedStacks).toHaveLength(1);
    expect(res.skippedCount).toBe(1);
  });
});
