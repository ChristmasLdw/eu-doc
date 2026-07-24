const STORAGE_PREFIX = 'eu-doc:onboarding';
const WELCOME_VERSION = 2;

function getScopeKey(scope) {
  return scope || 'guest';
}

function readJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn(`Unable to read tutorial state for ${key}`, error);
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to save tutorial state for ${key}`, error);
  }
}

export function getTutorialStorageKey(scope, tutorialId, version) {
  return `${STORAGE_PREFIX}:${getScopeKey(scope)}:${tutorialId}:v${version}`;
}

export function readTutorialProgress(scope, tutorialId, version) {
  return readJson(getTutorialStorageKey(scope, tutorialId, version));
}

export function saveTutorialProgress(scope, tutorialId, version, update) {
  const key = getTutorialStorageKey(scope, tutorialId, version);
  const previous = readJson(key) || {};
  const next = {
    ...previous,
    ...update,
    tutorialId,
    version,
    updatedAt: new Date().toISOString(),
  };

  writeJson(key, next);
  return next;
}

export function getWelcomeStorageKey(scope) {
  return `${STORAGE_PREFIX}:${getScopeKey(scope)}:welcome:v${WELCOME_VERSION}`;
}

export function hasSeenWelcome(scope) {
  return Boolean(readJson(getWelcomeStorageKey(scope))?.seenAt);
}

export function markWelcomeSeen(scope) {
  writeJson(getWelcomeStorageKey(scope), {
    version: WELCOME_VERSION,
    seenAt: new Date().toISOString(),
  });
}

export function resetTutorialProgress(scope, definitions) {
  Object.values(definitions).forEach(({ id, version }) => {
    localStorage.removeItem(getTutorialStorageKey(scope, id, version));
  });
  localStorage.removeItem(getWelcomeStorageKey(scope));
}
