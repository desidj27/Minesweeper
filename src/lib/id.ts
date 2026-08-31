export function newId(): string {
  return crypto.randomUUID();
}

export function newSeed(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
