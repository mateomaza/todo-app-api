import { sanitizeObject, sanitizeString } from './sanitize.service';

const xssPayloads = [
  "<script>alert('XSS')</script>",
  '<img src="x" onerror="alert(\'XSS\')"/>',
  '<a href="javascript:alert(\'XSS\')">Click me</a>',
  '<img src="javascript:alert(\'XSS\')">',
  '<div onmouseover="alert(\'XSS\')">Hover over me</div>',
  '<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;&#x61;&#x6C;&#x65;&#x72;&#x74;&#x28;&#x27;&#x58;&#x53;&#x53;&#x27;&#x29;">Click me</a>',
  "<script><!--alert('XSS')//--></script>",
  "<div style=\"background:url('javascript:alert(\\'XSS\\')')\"></div>",
  "<svg/onload=alert('XSS')>",
];

describe('XSS Sanitization', () => {
  xssPayloads.forEach((payload) => {
    it(`should sanitize string payload: ${payload}`, () => {
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toEqual(payload);
      if (payload.includes('<script>')) {
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('</script>');
      }
      if (payload.includes('javascript:')) {
        expect(sanitized).not.toContain('javascript:');
      }
      if (payload.includes('<img')) {
        expect(sanitized).not.toMatch(/<img[^>]*src=["']?javascript:/i);
      }
      if (payload.includes('onmouseover')) {
        expect(sanitized).not.toContain('onmouseover');
      }
      if (payload.includes('&#x6A;')) {
        expect(sanitized).not.toContain('&#x6A;');
      }
      if (payload.includes('<!--')) {
        expect(sanitized).not.toContain('<!--');
      }
      if (payload.includes('background:url')) {
        expect(sanitized).not.toContain('background:url');
      }
      if (payload.includes('<svg')) {
        expect(sanitized).not.toContain('<svg');
      }
    });
  });

  it('should sanitize object payload with potential XSS', () => {
    const objectPayload = {
      key: "<script>alert('XSS')</script>",
      anotherKey:
        "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(alert('XSS'))//<</style></script>",
    };
    const sanitizedObject = sanitizeObject(objectPayload);
    expect(sanitizedObject).not.toEqual(objectPayload);
    expect(sanitizedObject.key).not.toContain('<script>');
    expect(sanitizedObject.anotherKey).not.toContain('javascript:');
  });
});
