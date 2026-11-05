let activeStudentId: string | null = null;

export function setStudentStorageOwner(userId: string | null) {
  activeStudentId = userId && /^[a-zA-Z0-9_-]{1,128}$/.test(userId) ? userId : null;
}

export function studentStorageKey(key: string): string {
  const owner = activeStudentId ? "user-" + activeStudentId : "guest";
  return "studyspace:" + owner + ":" + key;
}
