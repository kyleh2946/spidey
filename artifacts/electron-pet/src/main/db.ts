import fs from "fs";
import path from "path";
import { app } from "electron";

export type DbUser = {
  id: number;
  coins: number;
  isPremium: boolean;
  ownedItemIds: string[];
  ownedPetIds: string[];
  dailyRewardClaimedAt: string | null;
};

export type DbPet = {
  id: number;
  userId: number;
  petType: string;
  name: string;
  hunger: number;
  happiness: number;
  health: number;
  cleanliness: number;
  age: number;
  isAlive: boolean;
  isDead: boolean;
  isActive: boolean;
  lastUpdatedAt: string;
};

type Store = {
  user: DbUser;
  pets: DbPet[];
  nextPetId: number;
};

let _store: Store | null = null;
let _dbPath: string | null = null;

function getDbPath(): string {
  if (_dbPath) return _dbPath;
  _dbPath = path.join(app.getPath("userData"), "spidey.json");
  return _dbPath;
}

function defaultStore(): Store {
  return {
    user: {
      id: 1,
      coins: 100,
      isPremium: false,
      ownedItemIds: [],
      ownedPetIds: ["tarantula_basic"],
      dailyRewardClaimedAt: null,
    },
    pets: [
      {
        id: 1,
        userId: 1,
        petType: "tarantula",
        name: "Spidey",
        hunger: 80,
        happiness: 80,
        health: 100,
        cleanliness: 90,
        age: 0,
        isAlive: true,
        isDead: false,
        isActive: true,
        lastUpdatedAt: new Date().toISOString(),
      },
    ],
    nextPetId: 2,
  };
}

export function getStore(): Store {
  if (_store) return _store;
  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    try {
      _store = JSON.parse(fs.readFileSync(dbPath, "utf-8")) as Store;
    } catch {
      _store = defaultStore();
    }
  } else {
    _store = defaultStore();
  }
  return _store;
}

export function saveStore(): void {
  if (!_store) return;
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(_store, null, 2), "utf-8");
}

export function getUser(): DbUser {
  return getStore().user;
}

export function updateUser(patch: Partial<DbUser>): DbUser {
  const store = getStore();
  store.user = { ...store.user, ...patch };
  saveStore();
  return store.user;
}

export function getActivePet(): DbPet | undefined {
  return getStore().pets.find(p => p.isActive);
}

export function updateActivePet(patch: Partial<DbPet>): DbPet | null {
  const store = getStore();
  const idx = store.pets.findIndex(p => p.isActive);
  if (idx === -1) return null;
  store.pets[idx] = { ...store.pets[idx], ...patch };
  saveStore();
  return store.pets[idx];
}

export function addPet(pet: Omit<DbPet, "id">): DbPet {
  const store = getStore();
  const newPet: DbPet = { ...pet, id: store.nextPetId++ };
  store.pets.push(newPet);
  saveStore();
  return newPet;
}

export function setActivePet(petId: number): DbPet | null {
  const store = getStore();
  store.pets = store.pets.map(p => ({ ...p, isActive: p.id === petId }));
  const active = store.pets.find(p => p.isActive) ?? null;
  saveStore();
  return active;
}

export function getAllPets(): DbPet[] {
  return getStore().pets;
}
