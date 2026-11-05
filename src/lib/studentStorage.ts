let activeStudentId: string | null = null;

export function setStudentStorageOwner(userId: string | null) {
  activeStudentId = userId && /^[a-zA-Z0-9_-]{1,128}$/.test(userId) ? userId : null;
}

export function studentStorageKey(key: string): string {
  const owner = activeStudentId ? "user-" + activeStudentId : "guest";
  return "studyspace:" + owner + ":" + key;
}

export function getStudentStorageOwner(): string | null { return activeStudentId; }

export function studentStorageKeyForUser(userId: string, key: string): string {
  return "studyspace:user-" + userId + ":" + key;
}
