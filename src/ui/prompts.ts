import * as p from '@clack/prompts';
import { colors } from './colors.js';

export function isInteractive(): boolean {
  return process.stdout.isTTY === true && process.env.CI !== 'true';
}

export async function promptSelectSkills(
  skills: Array<{ name: string; description: string }>,
  message = 'Select skills to import into store:'
): Promise<string[]> {
  if (!isInteractive() || skills.length <= 1) {
    return skills.map((s) => s.name);
  }

  const options = skills.map((s) => ({
    value: s.name,
    label: s.name,
    hint: s.description.slice(0, 70),
  }));

  const selected = await p.multiselect({
    message,
    options,
    initialValues: skills.map((s) => s.name),
    required: false,
  });

  if (p.isCancel(selected)) {
    return [];
  }

  return selected as string[];
}

export async function promptConfirm(message: string, defaultVal = true): Promise<boolean> {
  if (!isInteractive()) {
    return defaultVal;
  }

  const result = await p.confirm({
    message,
    initialValue: defaultVal,
  });

  if (p.isCancel(result)) {
    return false;
  }

  return Boolean(result);
}

export async function promptSelect(
  message: string,
  options: Array<{ value: string; label: string; hint?: string }>
): Promise<string | null> {
  if (!isInteractive()) {
    return options[0]?.value ?? null;
  }

  const result = await p.select({
    message,
    options,
  });

  if (p.isCancel(result)) {
    return null;
  }

  return result as string;
}
