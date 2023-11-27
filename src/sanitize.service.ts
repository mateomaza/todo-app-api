import xss from 'xss';

export function sanitizeInput(input: any) {
  return JSON.parse(xss(JSON.stringify(input)));
}
