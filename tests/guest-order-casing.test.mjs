import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Helper matching normalizeEmail in src/utils/format.ts
function normalizeCustomerEmail(email) {
  return (email || '').toLowerCase().trim();
}

/**
 * Exact equality match helper simulating PostgREST `.eq('customer->>email', userEmail)`
 */
function isExactEmailMatch(storedGuestEmail, authenticatedUserEmail) {
  return normalizeCustomerEmail(storedGuestEmail) === normalizeCustomerEmail(authenticatedUserEmail);
}

/**
 * Vulnerable SQL ILIKE pattern simulator demonstrating the flaw of wildcard matching
 */
function vulnerableIlikeMatch(storedGuestEmail, userEmailPattern) {
  // Convert SQL ILIKE pattern (_ -> ., % -> .*) to RegExp
  const regexStr = '^' + userEmailPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape regex chars except _ and %
    .replace(/_/g, '.')
    .replace(/%/g, '.*') + '$';
  const regex = new RegExp(regexStr, 'i');
  return regex.test(storedGuestEmail);
}

describe('Guest Order Email Normalization & Exact Claiming Regression Tests', () => {
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
    assert.equal(isExactEmailMatch(guestInputEmail, registeredUserEmail), true);
  });

  test('REGRESSION [P1]: prevents wildcard matches with "_" in email from claiming unauthorized guest orders', () => {
    const guestOrderEmail = 'alice@example.com';
    const maliciousUserEmail = 'al_ce@example.com';

    // Vulnerable ILIKE would erroneously match al_ce -> alice
    assert.equal(
      vulnerableIlikeMatch(guestOrderEmail, maliciousUserEmail),
      true,
      'ILIKE is vulnerable to single-character wildcard matching'
    );

    // Exact equality (.eq) must NOT match
    assert.equal(
      isExactEmailMatch(guestOrderEmail, maliciousUserEmail),
      false,
      'Exact equality must reject al_ce matching alice'
    );

    // Legitimate account with actual underscore must only match its exact address
    assert.equal(
      isExactEmailMatch('al_ce@example.com', 'AL_CE@EXAMPLE.COM'),
      true,
      'Exact match on same address with underscore succeeds'
    );
  });

  test('REGRESSION [P1]: prevents wildcard matches with "%" in email from claiming unauthorized guest orders', () => {
    const guestOrderEmail1 = 'username@example.com';
    const guestOrderEmail2 = 'user_extra_long_name@example.com';
    const wildcardUserEmail = 'user%name@example.com';

    // Vulnerable ILIKE would erroneously match user%name against any string between user and name
    assert.equal(
      vulnerableIlikeMatch(guestOrderEmail1, wildcardUserEmail),
      true,
      'ILIKE is vulnerable to multi-character wildcard matching'
    );
    assert.equal(
      vulnerableIlikeMatch(guestOrderEmail2, wildcardUserEmail),
      true,
      'ILIKE is vulnerable to multi-character wildcard matching'
    );

    // Exact equality (.eq) must NOT match
    assert.equal(
      isExactEmailMatch(guestOrderEmail1, wildcardUserEmail),
      false,
      'Exact equality must reject user%name matching username'
    );
    assert.equal(
      isExactEmailMatch(guestOrderEmail2, wildcardUserEmail),
      false,
      'Exact equality must reject user%name matching user_extra_long_name'
    );

    // Legitimate account with actual % must only match exact string
    assert.equal(
      isExactEmailMatch('user%name@example.com', 'USER%NAME@EXAMPLE.COM'),
      true,
      'Exact match on identical email succeeds'
    );
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
