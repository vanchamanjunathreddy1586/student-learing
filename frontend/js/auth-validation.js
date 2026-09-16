export const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

export const getPasswordStrength = (password = '') => {
  const value = String(password || '');
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (value.length === 0) {
    return { level: 'weak', score: 0, label: 'Weak', requirements: 'Use 8+ characters and a mix of letters, numbers, and symbols.' };
  }

  if (score <= 2) {
    return { level: 'weak', score, label: 'Weak', requirements: 'Add a number, uppercase letter, and symbol.' };
  }

  if (score <= 3) {
    return { level: 'medium', score, label: 'Medium', requirements: 'A little stronger — try adding a symbol or longer length.' };
  }

  return { level: 'strong', score, label: 'Strong', requirements: 'Excellent — this password is secure.' };
};

export const validateLoginForm = ({ email, password }) => {
  const errors = {};
  const normalizedEmail = String(email || '').trim();

  if (!normalizedEmail) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(normalizedEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (String(password).length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateRegisterForm = ({ fullName, email, password, confirmPassword, termsAccepted }) => {
  const errors = {};
  const normalizedName = String(fullName || '').trim();
  const normalizedEmail = String(email || '').trim();
  const strength = getPasswordStrength(password);

  if (!normalizedName) {
    errors.fullName = 'Please enter your full name.';
  }

  if (!normalizedEmail) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(normalizedEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (strength.level === 'weak') {
    errors.password = 'Choose a stronger password with at least 8 characters.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (String(confirmPassword) !== String(password)) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!termsAccepted) {
    errors.termsAccepted = 'You must accept the terms to continue.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateStudentProfile = ({ year, college }) => {
  const errors = {};
  const normalizedCollege = String(college || '').trim();

  if (!year) {
    errors.year = 'Please select your current year.';
  }

  if (!normalizedCollege) {
    errors.college = 'Please enter your college.';
  } else if (normalizedCollege.length < 2) {
    errors.college = 'College name must be at least 2 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
