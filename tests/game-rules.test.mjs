import assert from "node:assert/strict";
import test from "node:test";
import { DAILY_QUESTS, dailyOffers, penaltyAmount, unlockedTiles } from "../lib/quests.ts";
import { WORLD_ROUTE, areAdjacentTiles, isNextTile, isTileUnlocked, reachableTiles, routeRank } from "../lib/world-map.ts";

test("map starts with one tile and permanently caps at 36",()=>{assert.equal(unlockedTiles(0),1);assert.equal(unlockedTiles(99),1);assert.equal(unlockedTiles(100),2);assert.equal(unlockedTiles(99999),36)});
test("penalties never push the balance below zero",()=>{assert.equal(penaltyAmount(100),-25);assert.equal(penaltyAmount(12),-12);assert.equal(penaltyAmount(0),0)});
test("daily offers are deterministic, unique, and preference-aware",()=>{const a=dailyOffers("user-a","2026-08-26",["Outdoors"],[]),b=dailyOffers("user-a","2026-08-26",["Outdoors"],[]);assert.deepEqual(a,b);assert.equal(new Set(a.map(q=>q.id)).size,3);assert.ok(a.every(q=>q.zone==="Outdoors"));assert.ok(a.every(q=>DAILY_QUESTS.includes(q)))});
test("recent quests are excluded when enough alternatives exist",()=>{const first=dailyOffers("u","2026-08-26",["Fitness","Outdoors"],[]),next=dailyOffers("u","2026-08-27",["Fitness","Outdoors"],first.map(q=>q.id));assert.ok(next.every(q=>!first.some(old=>old.id===q.id)))});
test("world route opens adjacent tiles in order",()=>{assert.equal(WORLD_ROUTE.length,36);assert.equal(WORLD_ROUTE[0],30);assert.equal(routeRank(30),0);assert.equal(isTileUnlocked(30,1),true);assert.equal(isTileUnlocked(31,1),false);assert.equal(isNextTile(31,1),true);for(let i=1;i<WORLD_ROUTE.length;i++){assert.ok(areAdjacentTiles(WORLD_ROUTE[i],WORLD_ROUTE[i-1]))}});
test("movement only exposes opened neighboring tiles",()=>{assert.equal(areAdjacentTiles(30,31),true);assert.equal(areAdjacentTiles(30,24),true);assert.equal(areAdjacentTiles(30,35),false);assert.deepEqual(reachableTiles(31,3),[30,32]);assert.deepEqual(reachableTiles(31,1),[30])});
test("grid edges are not treated as neighbors",()=>{assert.equal(areAdjacentTiles(5,6),false);assert.equal(areAdjacentTiles(11,12),false);assert.equal(areAdjacentTiles(0,6),true)});
