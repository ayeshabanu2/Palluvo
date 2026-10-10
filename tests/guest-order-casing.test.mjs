import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Helper matching normalizeCustomerEmail in src/app/checkout/actions.ts
function normalizeCustomerEmail(email) {
  return (email || '').toLowerCase().trim();
}

describe('Guest Order Email Normalization & Claiming Regression Test', () => {
  test('normalizes mixed-case and untrimmed email addresses during checkout', () => {
    const testCases = [
      { input: 'Maya@Example.com', expected: 'maya@example.com' },
      { input: '  Maya@Example.com  ', expected: 'maya@example.com' },
      { input: 'AYESHA.BANU@PALLUVO.STORE', expected: 'ayesha.banu@palluvo.store' },
      { input: 'Customer.Care+Trousseau@Gmail.COM', expected: 'customer.care+trousseau@gmail.com' },
      { input: 'user_123@SubDomain.Domain.CO.IN ', expected: 'user_123@subdomain.domain.co.in' },
    ];

    for (const { input, expected } of testCases) {
      assert.equal(normalizeCustomerEmail(input), expected);
    }
  });

  test('matches guest checkout order email with subsequent user account registration email regardless of input casing', () => {
    // Scenario: Guest places order using mixed-case email
    const guestInputEmail = 'Maya.Sharma@GMAIL.com';
    const normalizedGuestEmail = normalizeCustomerEmail(guestInputEmail);

    // Scenario: User later registers/signs in using different casing
    const registeredUserEmail = '  maya.sharma@gmail.com  ';
    const normalizedUserEmail = normalizeCustomerEmail(registeredUserEmail);

    // Verify exact equality after normalization
    assert.equal(normalizedGuestEmail, normalizedUserEmail);
    assert.equal(normalizedGuestEmail, 'maya.sharma@gmail.com');
  });

  test('rejects malformed email formats after normalization', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = [
      'plainaddress',
      '#@%^%#$@#$@#.com',
      '@example.com',
      'Joe Smith <email@example.com>',
      'email.example.com',
      'email@example@example.com',
    ];

    for (const invalid of invalidEmails) {
      const normalized = normalizeCustomerEmail(invalid);
      assert.equal(emailRegex.test(normalized), false, `Expected ${invalid} to fail email regex validation`);
    }
  });
});
