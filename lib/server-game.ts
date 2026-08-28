import { env } from "cloudflare:workers";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { checkins, habits, profiles, proofs, questAssignments, users, xpEvents } from "@/db/schema";
import { LANDMARK_QUESTS, dailyOffers, questById, unlockedTiles } from "@/lib/quests";
import { LANDMARK_TILES, WORLD_ROUTE, reachableTiles, routeRank } from "@/lib/world-map";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

export const nowIso=()=>new Date().toISOString();
export function localDate(timezone:string,date=new Date()){ try{const parts=new Intl.DateTimeFormat("en",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);const get=(type:string)=>parts.find(p=>p.type===type)!.value;return `${get("year")}-${get("month")}-${get("day")}`}catch{return date.toISOString().slice(0,10)} }
export function nextLocalMidnight(timezone:string){ const current=localDate(timezone); let lo=Date.now(),hi=lo+36*3600000; while(hi-lo>1000){const mid=Math.floor((lo+hi)/2); if(localDate(timezone,new Date(mid))===current)lo=mid;else hi=mid} return new Date(hi).toISOString() }
export async function ensureUser(identity:ChatGPTUser,timezone:string){
 const db=getDb(), createdAt=nowIso();
 const existingUser=await db.select({id:users.id}).from(users).where(eq(users.id,identity.userId)).limit(1);
 await db.insert(users).values({id:identity.userId,email:identity.email,displayName:identity.displayName,timezone,createdAt}).onConflictDoUpdate({target:users.id,set:{email:identity.email,displayName:identity.displayName,timezone}});
 await db.insert(profiles).values({userId:identity.userId,name:identity.fullName??""}).onConflictDoNothing();
 if(!existingUser.length){ await db.insert(habits).values([
  {id:crypto.randomUUID(),userId:identity.userId,name:"Drink water",category:"Health",icon:"💧",color:"#58a6ff",createdAt},
  {id:crypto.randomUUID(),userId:identity.userId,name:"Read for 20 minutes",category:"Growth",icon:"📚",color:"#bc8cff",createdAt},
  {id:crypto.randomUUID(),userId:identity.userId,name:"Go for a run",category:"Health",icon:"🏃",color:"#39d353",createdAt},
 ]); }
}
export async function changeXp(userId:string,amount:number,sourceType:string,sourceId:string,lifetime=false){
 const db=getDb(), [user]=await db.select().from(users).where(eq(users.id,userId)).limit(1); if(!user)return;
 const actual=amount<0?-Math.min(user.xpBalance,Math.abs(amount)):amount; if(!actual)return;
 await db.insert(xpEvents).values({id:crypto.randomUUID(),userId,sourceType,sourceId,amount:actual,createdAt:nowIso()});
 await db.update(users).set({xpBalance:Math.max(0,user.xpBalance+actual),lifetimeXp:user.lifetimeXp+(lifetime&&actual>0?actual:0)}).where(eq(users.id,userId));
}
export async function reconcile(userId:string){
 const db=getDb(), overdue=await db.select().from(questAssignments).where(and(eq(questAssignments.userId,userId),eq(questAssignments.status,"active"),lt(questAssignments.deadlineAt,nowIso())));
 for(const item of overdue){ await db.update(questAssignments).set({status:"failed"}).where(eq(questAssignments.id,item.id)); await changeXp(userId,-25,"quest_penalty",item.id); }
}
export async function snapshot(userId:string){
 await reconcile(userId); const db=getDb();
 const [[user],profile,habitRows,checkRows,assignmentRows,proofRows]=await Promise.all([
  db.select().from(users).where(eq(users.id,userId)).limit(1),db.select().from(profiles).where(eq(profiles.userId,userId)).limit(1),db.select().from(habits).where(eq(habits.userId,userId)),db.select().from(checkins).where(eq(checkins.userId,userId)),db.select().from(questAssignments).where(eq(questAssignments.userId,userId)),db.select().from(proofs).where(and(eq(proofs.userId,userId),sql`${proofs.deletedAt} is null`)).orderBy(desc(proofs.createdAt)),
 ]);
 const date=localDate(user.timezone), recentSince=new Date(Date.now()-14*86400000).toISOString().slice(0,10), recent=assignmentRows.filter(a=>a.localDate>=recentSince).map(a=>a.questId);
 const offers=dailyOffers(userId,date,JSON.parse(user.preferences||"[]"),recent);
 for(const q of offers) await db.insert(questAssignments).values({id:crypto.randomUUID(),userId,questId:q.id,kind:"daily",localDate:date,status:"offered"}).onConflictDoNothing();
 const refreshed=await db.select().from(questAssignments).where(eq(questAssignments.userId,userId)); const unlocked=unlockedTiles(user.lifetimeXp); const currentTile=routeRank(user.worldPosition)>=0&&routeRank(user.worldPosition)<unlocked?user.worldPosition:(WORLD_ROUTE[Math.max(0,unlocked-1)]??WORLD_ROUTE[0]);
 const landmarks=LANDMARK_QUESTS.map((q,i)=>{const tile=LANDMARK_TILES[i];return {...q,tile,unlocked:routeRank(tile)>=0&&routeRank(tile)<unlocked,status:refreshed.find(a=>a.questId===q.id)?.status??"available"}});
 return {user:{...user,worldPosition:currentTile,preferences:JSON.parse(user.preferences||"[]"),unlockedTiles:unlocked},worldPosition:currentTile,currentTile,reachableTiles:reachableTiles(currentTile,unlocked),profile:profile[0],habits:habitRows.map(h=>({...h,days:checkRows.filter(c=>c.habitId===h.id).map(c=>c.date)})),daily:offers.map(q=>({...q,assignment:refreshed.find(a=>a.questId===q.id&&a.localDate===date)})),active:refreshed.filter(a=>a.status==="active").map(a=>({...a,quest:questById(a.questId)})),landmarks,proofs:proofRows.map(p=>({...p,objectKey:undefined}))};
}
export function r2(){ return (env as unknown as {PROOFS:R2Bucket}).PROOFS }
export function distanceMeters(a:{lat:number,lng:number},b:{lat:number,lng:number}){ const R=6371e3,p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,dp=(b.lat-a.lat)*Math.PI/180,dl=(b.lng-a.lng)*Math.PI/180; const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2; return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)); }
