import assert from "node:assert/strict";
import test from "node:test";
import { DAILY_QUESTS, dailyOffers, penaltyAmount, unlockedTiles } from "../lib/quests.ts";

test("map starts with one tile and permanently caps at 36",()=>{assert.equal(unlockedTiles(0),1);assert.equal(unlockedTiles(99),1);assert.equal(unlockedTiles(100),2);assert.equal(unlockedTiles(99999),36)});
test("penalties never push the balance below zero",()=>{assert.equal(penaltyAmount(100),-25);assert.equal(penaltyAmount(12),-12);assert.equal(penaltyAmount(0),0)});
test("daily offers are deterministic, unique, and preference-aware",()=>{const a=dailyOffers("user-a","2026-08-26",["Outdoors"],[]),b=dailyOffers("user-a","2026-08-26",["Outdoors"],[]);assert.deepEqual(a,b);assert.equal(new Set(a.map(q=>q.id)).size,3);assert.ok(a.every(q=>q.zone==="Outdoors"));assert.ok(a.every(q=>DAILY_QUESTS.includes(q)))});
test("recent quests are excluded when enough alternatives exist",()=>{const first=dailyOffers("u","2026-08-26",["Fitness","Outdoors"],[]),next=dailyOffers("u","2026-08-27",["Fitness","Outdoors"],first.map(q=>q.id));assert.ok(next.every(q=>!first.some(old=>old.id===q.id)))});
