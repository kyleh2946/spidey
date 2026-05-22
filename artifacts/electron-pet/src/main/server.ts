import express from "express";
import cors from "cors";
import {
  getUser, updateUser, getActivePet, updateActivePet,
  addPet, setActivePet, getAllPets, type DbPet,
} from "./db";

export const API_PORT = 57392;

const SHOP_ITEMS = [
  { id: "kibble_basic", name: "Basic Kibble", description: "Standard spider food.", price: 0, isPremium: false, category: "food", hungerBoost: 20, happinessBoost: 0, healthBoost: 0 },
  { id: "cricket_live", name: "Live Cricket", description: "A wriggling, fresh cricket.", price: 15, isPremium: false, category: "food", hungerBoost: 35, happinessBoost: 15, healthBoost: 0 },
  { id: "moth_premium", name: "Giant Moth", description: "A luscious, fluttery moth.", price: 30, isPremium: false, category: "food", hungerBoost: 50, happinessBoost: 25, healthBoost: 5 },
  { id: "roach_dubia", name: "Dubia Roach", description: "Nutritious and protein-packed.", price: 50, isPremium: true, category: "food", hungerBoost: 60, happinessBoost: 20, healthBoost: 15 },
  { id: "medicine_basic", name: "Spider Vitamins", description: "Boosts health.", price: 40, isPremium: false, category: "medicine", hungerBoost: 0, happinessBoost: 0, healthBoost: 40 },
  { id: "medicine_premium", name: "Liquid Gold Supplement", description: "Premium health boost.", price: 80, isPremium: true, category: "medicine", hungerBoost: 0, happinessBoost: 10, healthBoost: 70 },
  { id: "toy_web", name: "Vibrating Web Toy", description: "A fake insect on a wire.", price: 25, isPremium: false, category: "accessory", hungerBoost: 0, happinessBoost: 30, healthBoost: 0 },
  { id: "toy_terrarium", name: "Luxury Terrarium", description: "Beautiful habitat with real moss.", price: 100, isPremium: true, category: "accessory", hungerBoost: 0, happinessBoost: 50, healthBoost: 10 },
];

const SHOP_PETS = [
  { id: "tarantula_basic", petType: "tarantula", name: "Chilean Rose Tarantula", description: "The classic. Fuzzy and docile.", price: 0, isPremium: false, rarity: "common" },
  { id: "scorpion", petType: "scorpion", name: "Emperor Scorpion", description: "Glossy black and intimidating.", price: 200, isPremium: false, rarity: "rare" },
  { id: "dragon_spider", petType: "dragon_spider", name: "Dragon Spider", description: "A mythical spider-dragon hybrid.", price: 500, isPremium: true, rarity: "legendary" },
  { id: "golden_tarantula", petType: "golden_tarantula", name: "Golden Tarantula", description: "Shimmering gold. Brings good luck.", price: 350, isPremium: true, rarity: "legendary" },
];

function syncPetDecay(pet: DbPet): DbPet & { mood: string; screenEatPercent: number } {
  const now = new Date();
  const last = new Date(pet.lastUpdatedAt);
  const mins = Math.floor((now.getTime() - last.getTime()) / 60000);

  let hunger = Math.max(0, pet.hunger - mins * 2);
  let happiness = Math.max(0, pet.happiness - mins * 1);
  let health = pet.health;
  let cleanliness = Math.max(0, pet.cleanliness - mins * 1);
  let age = pet.age + mins;
  let isDead = pet.isDead;
  let isAlive = pet.isAlive;

  if (isAlive && !isDead && hunger < 20) {
    health = Math.max(0, health - mins * 2);
  }
  if (health <= 0 || (!isDead && hunger <= 0 && health <= 10)) {
    isDead = true;
    isAlive = false;
  }

  const updated = updateActivePet({ hunger, happiness, health, cleanliness, age, isDead, isAlive, lastUpdatedAt: now.toISOString() });
  const base = updated ?? { ...pet, hunger, happiness, health, cleanliness, age, isDead, isAlive };

  let mood: string;
  let screenEatPercent: number;

  if (isDead) { mood = "dead"; screenEatPercent = 100; }
  else if (health < 20 || hunger < 10) { mood = "dying"; screenEatPercent = Math.min(100, Math.floor((30 - hunger) * (100 / 30))); }
  else if (hunger < 30) { mood = "eating_screen"; screenEatPercent = Math.min(100, Math.floor((30 - hunger) * (100 / 30))); }
  else if (hunger < 50) { mood = "angry"; screenEatPercent = 0; }
  else if (hunger < 60) { mood = "hungry"; screenEatPercent = 0; }
  else if (happiness > 70 && hunger > 70) { mood = "happy"; screenEatPercent = 0; }
  else { mood = "content"; screenEatPercent = 0; }

  return { ...base, mood, screenEatPercent };
}

function formatPet(p: ReturnType<typeof syncPetDecay>) {
  return {
    id: p.id, petType: p.petType, name: p.name,
    hunger: p.hunger, happiness: p.happiness, health: p.health, cleanliness: p.cleanliness,
    age: p.age, isAlive: p.isAlive, isDead: p.isDead,
    screenEatPercent: p.screenEatPercent, mood: p.mood, lastUpdatedAt: p.lastUpdatedAt,
  };
}

function formatUser(u: ReturnType<typeof getUser>) {
  return {
    id: u.id, coins: u.coins, isPremium: u.isPremium,
    ownedItemIds: u.ownedItemIds, ownedPetIds: u.ownedPetIds,
    dailyRewardClaimedAt: u.dailyRewardClaimedAt,
  };
}

export function startServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

    app.get("/api/user", (_req, res) => res.json(formatUser(getUser())));

    app.get("/api/pet", (_req, res) => {
      const pet = getActivePet();
      if (!pet) return res.status(404).json({ error: "No pet found" });
      res.json(formatPet(syncPetDecay(pet)));
    });

    app.post("/api/pet/feed", (req, res) => {
      const pet = getActivePet();
      if (!pet) return res.status(404).json({ error: "No pet" });
      if (pet.isDead) return res.status(400).json({ error: "Your pet is dead." });

      const synced = syncPetDecay(pet);
      const { foodItemId } = req.body;
      let hungerBoost = 20, happinessBoost = 0, healthBoost = 0;

      if (foodItemId && foodItemId !== "kibble_basic") {
        const item = SHOP_ITEMS.find(i => i.id === foodItemId);
        if (!item) return res.status(400).json({ error: "Unknown item" });
        const user = getUser();
        if (item.isPremium && !user.isPremium) return res.status(400).json({ error: "Requires premium." });
        if (!user.ownedItemIds.includes(foodItemId)) return res.status(400).json({ error: "You don't own this item." });
        hungerBoost = item.hungerBoost; happinessBoost = item.happinessBoost; healthBoost = item.healthBoost;
      }

      updateActivePet({
        hunger: Math.min(100, synced.hunger + hungerBoost),
        happiness: Math.min(100, synced.happiness + happinessBoost),
        health: Math.min(100, synced.health + healthBoost),
        lastUpdatedAt: new Date().toISOString(),
      });

      const fresh = getActivePet()!;
      res.json(formatPet(syncPetDecay(fresh)));
    });

    app.post("/api/pet/play", (_req, res) => {
      const pet = getActivePet();
      if (!pet) return res.status(404).json({ error: "No pet" });
      if (pet.isDead) return res.status(400).json({ error: "Your pet is dead." });
      const synced = syncPetDecay(pet);
      updateActivePet({
        happiness: Math.min(100, synced.happiness + 25),
        hunger: Math.max(0, synced.hunger - 5),
        lastUpdatedAt: new Date().toISOString(),
      });
      res.json(formatPet(syncPetDecay(getActivePet()!)));
    });

    app.post("/api/pet/clean", (_req, res) => {
      const pet = getActivePet();
      if (!pet) return res.status(404).json({ error: "No pet" });
      if (pet.isDead) return res.status(400).json({ error: "Your pet is dead." });
      const synced = syncPetDecay(pet);
      updateActivePet({
        cleanliness: Math.min(100, synced.cleanliness + 40),
        happiness: Math.min(100, synced.happiness + 10),
        lastUpdatedAt: new Date().toISOString(),
      });
      res.json(formatPet(syncPetDecay(getActivePet()!)));
    });

    app.post("/api/pet/revive", (_req, res) => {
      const pet = getActivePet();
      if (!pet) return res.status(404).json({ error: "No pet" });
      if (!pet.isDead) return res.status(400).json({ error: "Pet is not dead." });
      const user = getUser();
      if (!user.isPremium && user.coins < 150) return res.status(403).json({ error: "Need 150 coins or premium to revive." });
      if (!user.isPremium) updateUser({ coins: user.coins - 150 });
      updateActivePet({ hunger: 60, happiness: 50, health: 60, cleanliness: 70, isDead: false, isAlive: true, lastUpdatedAt: new Date().toISOString() });
      res.json(formatPet(syncPetDecay(getActivePet()!)));
    });

    app.post("/api/pet/select", (req, res) => {
      const { petId } = req.body;
      const pet = setActivePet(petId);
      if (!pet) return res.status(404).json({ error: "Pet not found." });
      res.json(formatPet(syncPetDecay(pet)));
    });

    app.post("/api/user/earn-coins", (req, res) => {
      const user = getUser();
      const { source } = req.body;
      if (source === "daily") {
        if (user.dailyRewardClaimedAt) {
          const hoursSince = (Date.now() - new Date(user.dailyRewardClaimedAt).getTime()) / 3600000;
          if (hoursSince < 24) return res.status(400).json({ error: "Already claimed today." });
        }
        const reward = user.isPremium ? 75 : 30;
        res.json(formatUser(updateUser({ coins: user.coins + reward, dailyRewardClaimedAt: new Date().toISOString() })));
      } else {
        res.json(formatUser(updateUser({ coins: user.coins + 20 })));
      }
    });

    app.post("/api/user/upgrade-premium", (_req, res) => {
      res.json(formatUser(updateUser({ isPremium: true })));
    });

    app.get("/api/shop/items", (_req, res) => res.json(SHOP_ITEMS));
    app.get("/api/shop/pets", (_req, res) => res.json(SHOP_PETS));

    app.post("/api/shop/purchase", (req, res) => {
      const user = getUser();
      const { itemId, petId } = req.body;

      if (itemId) {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return res.status(400).json({ error: "Item not found." });
        if (item.isPremium && !user.isPremium) return res.status(400).json({ error: "Requires premium." });
        if (user.ownedItemIds.includes(itemId)) return res.status(400).json({ error: "Already owned." });
        if (user.coins < item.price) return res.status(400).json({ error: "Not enough coins." });
        const updated = updateUser({ coins: user.coins - item.price, ownedItemIds: [...user.ownedItemIds, itemId] });
        return res.json({ success: true, message: `Purchased ${item.name}!`, user: formatUser(updated) });
      }

      if (petId) {
        const shopPet = SHOP_PETS.find(p => p.id === petId);
        if (!shopPet) return res.status(400).json({ error: "Pet not found." });
        if (shopPet.isPremium && !user.isPremium) return res.status(400).json({ error: "Requires premium." });
        if (user.ownedPetIds.includes(petId)) return res.status(400).json({ error: "Already owned." });
        if (user.coins < shopPet.price) return res.status(400).json({ error: "Not enough coins." });
        const updated = updateUser({ coins: user.coins - shopPet.price, ownedPetIds: [...user.ownedPetIds, petId] });
        addPet({ userId: 1, petType: shopPet.petType, name: shopPet.name, hunger: 80, happiness: 80, health: 100, cleanliness: 90, age: 0, isAlive: true, isDead: false, isActive: false, lastUpdatedAt: new Date().toISOString() });
        return res.json({ success: true, message: `Adopted ${shopPet.name}!`, user: formatUser(updated) });
      }

      res.status(400).json({ error: "Provide itemId or petId." });
    });

    app.listen(API_PORT, "127.0.0.1", () => {
      console.log(`Spidey API running on port ${API_PORT}`);
      resolve();
    });
  });
}
