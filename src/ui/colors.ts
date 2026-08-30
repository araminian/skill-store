import pc from 'picocolors';

export const colors = {
  accent: pc.cyan,
  bold: pc.bold,
  dim: pc.dim,
  green: pc.green,
  yellow: pc.yellow,
  red: pc.red,
  blue: pc.blue,
  magenta: pc.magenta,
  gray: pc.gray,

  success: (text: string) => pc.green(`✔ ${text}`),
  info: (text: string) => pc.blue(`ℹ ${text}`),
  warning: (text: string) => pc.yellow(`⚠ ${text}`),
  error: (text: string) => pc.red(`✖ ${text}`),
  highlight: (text: string) => pc.cyan(pc.bold(text)),
};
