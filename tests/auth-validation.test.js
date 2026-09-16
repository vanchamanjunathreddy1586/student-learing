import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidEmail,
  getPasswordStrength,
  validateLoginForm,
  validateRegisterForm,
  validateStudentProfile,
} from '../frontend/js/auth-validation.js';

test('email validation accepts a valid student address', () => {
  assert.equal(isValidEmail('student@college.edu'), true);
});

test('password strength detects weak and strong values', () => {
  assert.equal(getPasswordStrength('abc').level, 'weak');
  assert.equal(getPasswordStrength('StrongPass!2024').level, 'strong');
});

test('login validation returns friendly errors without exposing secrets', () => {
  const result = validateLoginForm({ email: 'student@college.edu', password: 'short' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.password, 'Password must be at least 8 characters long.');
});

test('registration validation enforces matching passwords and terms', () => {
  const result = validateRegisterForm({
    fullName: 'Alex Student',
    email: 'alex@college.edu',
    password: 'StrongPass!2024',
    confirmPassword: 'DifferentPass!2024',
    termsAccepted: false,
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.confirmPassword, 'Passwords do not match.');
  assert.equal(result.errors.termsAccepted, 'You must accept the terms to continue.');
});

test('profile validation demands both year and college', () => {
  const result = validateStudentProfile({ year: '', college: 'City Tech' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.year, 'Please select your current year.');
});
