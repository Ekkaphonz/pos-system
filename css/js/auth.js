/* ============================================================
   FILE: js/auth.js
   Admin authentication — login, logout, session checking
   ============================================================ */

const AUTH_KEY     = 'posAdminSession';
const CRED_KEY     = 'posAdminCredentials';

/* ── Default admin credentials (set on first run) ──────── */
const DEFAULT_USERNAME = 'Boky';
const DEFAULT_PASSWORD = 'Ekkaphon2027';

/**
 * Ensure default credentials exist in LocalStorage.
 * Called once on login page load.
 */
function initCredentials() {
  if (!localStorage.getItem(CRED_KEY)) {
    localStorage.setItem(CRED_KEY, JSON.stringify({
      username: DEFAULT_USERNAME,
      password: DEFAULT_PASSWORD,
    }));
  }
}

/**
 * Attempt login with provided username and password.
 * Returns true on success, false on failure.
 */
function attemptLogin(username, password) {
  try {
    const raw   = localStorage.getItem(CRED_KEY);
    const creds = raw ? JSON.parse(raw) : { username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD };
    if (username === creds.username && password === creds.password) {
      // Save session token with timestamp
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        loggedIn:  true,
        username:  username,
        loginTime: new Date().toISOString(),
      }));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Login error:', e);
    return false;
  }
}

/**
 * Check if the admin is currently logged in.
 * Returns true if a valid session exists.
 */
function isLoggedIn() {
  try {
    const raw     = localStorage.getItem(AUTH_KEY);
    const session = raw ? JSON.parse(raw) : null;
    return session && session.loggedIn === true;
  } catch (e) {
    return false;
  }
}

/**
 * Log out the admin by clearing the session.
 * Redirects to login.html.
 */
function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'login.html';
}

/**
 * Guard function — call this at the top of admin.html.
 * Redirects to login if not authenticated.
 */
function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

/**
 * Get the username of the current session.
 */
function getSessionUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw).username : 'Admin';
  } catch (e) {
    return 'Admin';
  }
}