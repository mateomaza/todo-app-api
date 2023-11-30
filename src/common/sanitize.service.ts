import xss from 'xss';

function escapeSpecialCharacters(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function detectAdvancedXSSPatterns(value: string): boolean {
  const xssDetectionPattern =
    /(?:<script.*?>|<\/script>|javascript:|data:text\/html|on\w*\s*=|(?:%3C|%3E|%3D|%2F|%27|%22|%60|%28|%29|%3B|%2E|%26|%23|%25|%2B|%2D|%5E|%7C|%7B|%7D|%5B|%5D|%24|%2A|%3F|%40|%5F|%21|%2C|%3A|%7E))/gi;
  const decodedValue = decodeURIComponent(value);
  return xssDetectionPattern.test(decodedValue);
}

const options = {
  onTagAttr: (tag: string, name: string, value: string) => {
    if (detectAdvancedXSSPatterns(value)) {
      return '';
    }
    return escapeSpecialCharacters(value);
  },
};

export function sanitizeObject(input: any) {
  try {
    return JSON.parse(xss(JSON.stringify(input), options));
  } catch (error) {
    throw new Error(error);
  }
}

export function sanitizeString(input: string): string {
  return xss(input, options);
}
