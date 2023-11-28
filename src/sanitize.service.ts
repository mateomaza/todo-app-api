import xss from 'xss';

export function sanitizeObject(input: any) {
  return JSON.parse(xss(JSON.stringify(input)));
}

export function sanitizeString(input: string): string {
  return xss(input);
}
