import type { StackDefinition, StackSkillItem } from '../types.js';

export const CANONICAL_ID_REGEX = /^[a-z0-9-]+(\/[a-z0-9-]+)+$/;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CatalogValidationResult {
  valid: boolean;
  errors: string[];
  validatedStacks: StackDefinition[];
  skippedCount: number;
}

export function validateSkillItem(item: unknown, stackId: string): { valid: boolean; error?: string } {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: `Skill in "${stackId}" must be an object with at least a "name" property.` };
  }

  const obj = item as Record<string, unknown>;

  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    return { valid: false, error: `Skill in "${stackId}" is missing a valid string "name".` };
  }

  if (obj.source !== undefined && typeof obj.source !== 'string') {
    return { valid: false, error: `Skill "${obj.name}" in "${stackId}" has non-string "source".` };
  }

  if (obj.subpath !== undefined && typeof obj.subpath !== 'string') {
    return { valid: false, error: `Skill "${obj.name}" in "${stackId}" has non-string "subpath".` };
  }

  if (obj.ref !== undefined && typeof obj.ref !== 'string') {
    return { valid: false, error: `Skill "${obj.name}" in "${stackId}" has non-string "ref".` };
  }

  return { valid: true };
}

export function validateStack(stack: unknown, seenIds?: Set<string>): ValidationResult {
  const errors: string[] = [];

  if (!stack || typeof stack !== 'object') {
    return { valid: false, errors: ['Stack must be a non-null object.'] };
  }

  const s = stack as Record<string, unknown>;

  // 1. Validate ID
  if (typeof s.id !== 'string' || s.id.trim().length === 0) {
    errors.push('Missing required string "id".');
  } else {
    const id = s.id.trim();
    if (!CANONICAL_ID_REGEX.test(id)) {
      errors.push(
        `Invalid canonical "id" format "${id}". Must be lowercase alphanumeric with slash e.g. "frontend/nextjs".`
      );
    }
    if (seenIds && seenIds.has(id.toLowerCase())) {
      errors.push(`Duplicate stack id "${id}" found in catalog.`);
    }
  }

  const stackId = typeof s.id === 'string' ? s.id : 'unknown';

  // 2. Validate Name
  if (typeof s.name !== 'string' || s.name.trim().length === 0) {
    errors.push(`Stack "${stackId}": Missing required string "name".`);
  }

  // 3. Validate Category
  if (typeof s.category !== 'string' || s.category.trim().length === 0) {
    errors.push(`Stack "${stackId}": Missing required string "category".`);
  }

  // 4. Validate Description
  if (typeof s.description !== 'string' || s.description.trim().length === 0) {
    errors.push(`Stack "${stackId}": Missing required string "description".`);
  }

  // 5. Validate Extends
  if (s.extends !== undefined) {
    if (typeof s.extends !== 'string' || s.extends.trim().length === 0) {
      errors.push(`Stack "${stackId}": "extends" must be a non-empty string referencing a parent stack ID.`);
    }
  }

  // 6. Validate Tags
  if (s.tags !== undefined) {
    if (!Array.isArray(s.tags) || !s.tags.every((t) => typeof t === 'string')) {
      errors.push(`Stack "${stackId}": "tags" must be an array of strings.`);
    }
  }

  // 7. Validate Skills
  if (!Array.isArray(s.skills) || s.skills.length === 0) {
    errors.push(`Stack "${stackId}": "skills" must be a non-empty array of skill objects.`);
  } else {
    for (let i = 0; i < s.skills.length; i++) {
      const skillRes = validateSkillItem(s.skills[i], stackId);
      if (!skillRes.valid && skillRes.error) {
        errors.push(`Stack "${stackId}" skill[${i}]: ${skillRes.error}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateRegistryCatalog(catalog: unknown): CatalogValidationResult {
  const errors: string[] = [];
  const validatedStacks: StackDefinition[] = [];
  let skippedCount = 0;

  if (!catalog || typeof catalog !== 'object') {
    return {
      valid: false,
      errors: ['Registry catalog must be an object containing a "stacks" array.'],
      validatedStacks: [],
      skippedCount: 0,
    };
  }

  const cat = catalog as Record<string, unknown>;

  if (!Array.isArray(cat.stacks)) {
    return {
      valid: false,
      errors: ['Missing "stacks" array in registry catalog.'],
      validatedStacks: [],
      skippedCount: 0,
    };
  }

  const seenIds = new Set<string>();

  for (let i = 0; i < cat.stacks.length; i++) {
    const rawStack = cat.stacks[i];
    const validation = validateStack(rawStack, seenIds);

    if (validation.valid) {
      const s = rawStack as StackDefinition;
      seenIds.add(s.id.toLowerCase());
      validatedStacks.push(s);
    } else {
      skippedCount++;
      errors.push(...validation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validatedStacks,
    skippedCount,
  };
}
