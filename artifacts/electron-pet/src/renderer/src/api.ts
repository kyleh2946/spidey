const BASE = "http://127.0.0.1:57392/api";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export type Pet = {
  id: number;
  petType: string;
  name: string;
  hunger: number;
  happiness: number;
  health: number;
  cleanliness: number;
  age: number;
  isAlive: boolean;
  isDead: boolean;
  screenEatPercent: number;
  mood: string;
  lastUpdatedAt: string;
};

export type User = {
  id: number;
  coins: number;
  isPremium: boolean;
  ownedItemIds: string[];
  ownedPetIds: string[];
  dailyRewardClaimedAt: string | null;
};

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  isPremium: boolean;
  category: string;
  hungerBoost: number;
  happinessBoost: number;
  healthBoost: number;
};

export type ShopPet = {
  id: string;
  petType: string;
  name: string;
  description: string;
  price: number;
  isPremium: boolean;
  rarity: string;
};

export type PurchaseResult = {
  success: boolean;
  user: User;
  message: string;
};

export const api = {
  getPet: () => req<Pet>("/pet"),
  feedPet: (foodItemId: string | null) => req<Pet>("/pet/feed", { method: "POST", body: JSON.stringify({ foodItemId }) }),
  playWithPet: () => req<Pet>("/pet/play", { method: "POST" }),
  cleanPet: () => req<Pet>("/pet/clean", { method: "POST" }),
  revivePet: () => req<Pet>("/pet/revive", { method: "POST" }),
  selectPet: (petId: number) => req<Pet>("/pet/select", { method: "POST", body: JSON.stringify({ petId }) }),
  getUser: () => req<User>("/user"),
  earnCoins: (source: "daily" | "ad") => req<User>("/user/earn-coins", { method: "POST", body: JSON.stringify({ source }) }),
  upgradePremium: () => req<User>("/user/upgrade-premium", { method: "POST" }),
  getShopItems: () => req<ShopItem[]>("/shop/items"),
  getShopPets: () => req<ShopPet[]>("/shop/pets"),
  purchaseItem: (itemId: string | null, petId: string | null) => req<PurchaseResult>("/shop/purchase", { method: "POST", body: JSON.stringify({ itemId, petId }) }),
};
