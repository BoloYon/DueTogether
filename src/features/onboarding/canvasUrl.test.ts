import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCanvasBaseUrl } from './canvasUrl';

test('accepts https origins and reduces paths to the origin', () => {
  assert.deepEqual(validateCanvasBaseUrl(' https://School.Example.edu/ '), { ok: true, origin: 'https://school.example.edu', host: 'school.example.edu' });
  assert.deepEqual(validateCanvasBaseUrl('https://canvas.example.edu/courses'), { ok: true, origin: 'https://canvas.example.edu', host: 'canvas.example.edu' });
  assert.deepEqual(validateCanvasBaseUrl('canvas.example.edu'), { ok: true, origin: 'https://canvas.example.edu', host: 'canvas.example.edu' });
  assert.deepEqual(validateCanvasBaseUrl('https://canvas.example.edu:443'), { ok: true, origin: 'https://canvas.example.edu', host: 'canvas.example.edu' });
  const port = validateCanvasBaseUrl('https://canvas.example.edu:8443');
  assert.ok(port.ok && port.origin === 'https://canvas.example.edu:8443');
});

test('rejects non-https schemes, credentials, queries and bad hosts', () => {
  for (const input of ['http://canvas.example.edu', 'javascript:alert(1)', 'ftp://canvas.example.edu', 'file:///etc/passwd', 'https:canvas.example.edu', '//canvas.example.edu']) {
    assert.equal(validateCanvasBaseUrl(input).ok, false, input);
  }
  for (const input of ['https://user:pass@canvas.example.edu', 'https://token@canvas.example.edu', 'https://canvas.example.edu/?access_token=abc', 'https://canvas.example.edu#x']) {
    assert.equal(validateCanvasBaseUrl(input).ok, false, input);
  }
  for (const input of ['', '   ', 'https://localhost', 'https://-bad.example.edu', 'https://canvas .example.edu', 'https://1.2.3.4', 'https://canvas.example.edu:99999']) {
    assert.equal(validateCanvasBaseUrl(input).ok, false, input);
  }
});
