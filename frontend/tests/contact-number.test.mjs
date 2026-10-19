import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactDigits } from '../src/lib/contact-number.ts';

test('Türkiye numaralarını uluslararası bağlantıya dönüştürür', () => {
  for (const value of ['0532 123 45 67', '5321234567', '+90 5321234567', '00905321234567']) {
    assert.equal(contactDigits(value), '905321234567');
  }
  assert.equal(contactDigits('+44 7700 900123'), '447700900123');
});
test('eksik, boş veya geçersiz numarada bağlantı üretmez', () => {
  for (const value of [null, undefined, '', '  ', 'yok', '123', '00000000', '1234567890123456']) {
    assert.equal(contactDigits(value), '');
  }
});
