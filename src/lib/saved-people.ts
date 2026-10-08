import type { BirthInput } from "@/lib/saju";

export interface SavedPerson {
  id: string;
  name: string;
  relation: string;
  birthInput: BirthInput;
  isSelf: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SavedPeopleState {
  version: 1;
  people: SavedPerson[];
}

const STORAGE_KEY = "saju-app:saved-people:v1";

function nowIso(): string {
  return new Date().toISOString();
}

export function loadSavedPeople(): SavedPerson[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPeopleState;
    return Array.isArray(parsed.people) ? parsed.people : [];
  } catch {
    return [];
  }
}

function writeSavedPeople(people: SavedPerson[]): SavedPerson[] {
  if (typeof window === "undefined") return people;
  const state: SavedPeopleState = { version: 1, people };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("saju:saved-people-changed"));
  return people;
}

export function upsertSavedPerson(input: {
  id?: string;
  name: string;
  relation?: string;
  birthInput: BirthInput;
  isSelf?: boolean;
}): SavedPerson {
  const people = loadSavedPeople();
  const existing = input.id
    ? people.find((person) => person.id === input.id)
    : input.isSelf
      ? people.find((person) => person.isSelf)
      : null;
  const timestamp = nowIso();
  const id =
    existing?.id ??
    input.id ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `person-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  const person: SavedPerson = {
    id,
    name: input.name.trim() || (input.isSelf ? "나" : "저장한 사람"),
    relation: input.relation?.trim() || (input.isSelf ? "본인" : "지인"),
    birthInput: input.birthInput,
    isSelf: Boolean(input.isSelf),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const next = people.filter((item) => item.id !== id && (!person.isSelf || !item.isSelf));
  next.unshift(person);
  writeSavedPeople(next);
  return person;
}

export function removeSavedPerson(id: string): void {
  writeSavedPeople(loadSavedPeople().filter((person) => person.id !== id));
}

export function findSavedSelf(): SavedPerson | null {
  return loadSavedPeople().find((person) => person.isSelf) ?? null;
}
