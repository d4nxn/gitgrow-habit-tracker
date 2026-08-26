import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { ensureUser, snapshot } from "@/lib/server-game";
export async function GET(request:Request){ const identity=await getChatGPTUser(); if(!identity)return Response.json({error:"Sign in required",signIn:chatGPTSignInPath("/")},{status:401}); const timezone=new URL(request.url).searchParams.get("timezone")||"UTC"; await ensureUser(identity,timezone); return Response.json(await snapshot(identity.userId)); }
