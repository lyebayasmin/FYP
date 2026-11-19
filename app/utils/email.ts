// Email check: only complete Gmail addresses are accepted (name@gmail.com)

const GMAIL_NAME = /^[a-z0-9]+(\.[a-z0-9]+)*$/; // letters, numbers, single dots (no leading/trailing/double dot)

/** Returns an error message, or null when the email is a correct Gmail address. */
export const checkEmail = (raw: string): string | null => {
  const e = raw.trim().toLowerCase();

  if (!e.includes('@')) return 'Please enter your full email, like name@gmail.com';
  const parts = e.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return 'Please enter your full email, like name@gmail.com';

  const [name, domain] = parts;
  if (domain !== 'gmail.com') {
    return `Only Gmail addresses are accepted. Please use ${name}@gmail.com`;
  }
  if (!GMAIL_NAME.test(name)) {
    return 'The part before @gmail.com can only have letters, numbers and single dots.';
  }
  if (name.length < 6 || name.length > 30) {
    return 'A Gmail address must have 6 to 30 characters before @gmail.com.';
  }
  return null;
};
