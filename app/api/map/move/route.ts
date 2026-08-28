import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { snapshot } from "@/lib/server-game";
import { unlockedTiles } from "@/lib/quests";
import { areAdjacentTiles, isTileUnlocked, reachableTiles } from "@/lib/world-map";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { tile?: unknown };
  const tile = Number(body.tile);
  if (!Number.isInteger(tile) || tile < 0 || tile >= 36) return Response.json({ error: "Invalid map tile" }, { status: 400 });
  const db = getDb();
  const [record] = await db.select().from(users).where(eq(users.id, user.userId)).limit(1);
  if (!record) return Response.json({ error: "User not found" }, { status: 404 });
  const unlocked = unlockedTiles(record.lifetimeXp);
  const current = isTileUnlocked(record.worldPosition, unlocked) ? record.worldPosition : 30;
  if (!isTileUnlocked(tile, unlocked) || !areAdjacentTiles(current, tile) || !reachableTiles(current, unlocked).includes(tile)) {
    return Response.json({ error: "That tile is not reachable" }, { status: 403 });
  }
  await db.update(users).set({ worldPosition: tile }).where(eq(users.id, user.userId));
  return Response.json(await snapshot(user.userId));
}
