import { sanitizeInput } from './sanitize.service';

const xssPayloads = [
  "<script>alert('XSS')</script>",
  '<img src="x" onerror="alert(\'XSS\')"/>',
  '<a href="javascript:alert(\'XSS\')">Click me</a>',
  '<img src="javascript:alert(\'XSS\')">',
  '<iframe src="javascript:alert(\'XSS\');"></iframe>',
  '<div onmouseover="alert(\'XSS\')">Hover over me</div>',
  "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(alert('XSS'))//<</style></script>",
  '<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;&#x61;&#x6C;&#x65;&#x72;&#x74;&#x28;&#x27;&#x58;&#x53;&#x53;&#x27;&#x29;">Click me</a>',
  "<script><!--alert('XSS')//--></script>",
  "<div style=\"background:url('javascript:alert(\\'XSS\\')')\"></div>",
  "<svg/onload=alert('XSS')>",
];

describe('XSS Sanitization', () => {
  xssPayloads.forEach((payload) => {
    it(`should sanitize payload: ${payload}`, () => {
      const sanitized = sanitizeInput(payload);
      expect(sanitized).not.toEqual(payload);
    });
  });
});
