export type ProofKind = "photo" | "location" | "either";
export type QuestDef = { id:string; title:string; description:string; zone:string; proof:ProofKind; kind:"daily"|"landmark" };
export const ZONES = ["Fitness","Outdoors","Social","Courage","Creativity","Mindfulness"] as const;
const daily=(id:string,title:string,zone:string,proof:ProofKind,description:string):QuestDef=>({id,title,zone,proof,description,kind:"daily"});
export const DAILY_QUESTS:QuestDef[]=[
 daily("fit-stairs","Take the stairs","Fitness","photo","Choose stairs instead of an elevator today."),daily("fit-walk20","Move for 20 minutes","Fitness","location","Walk outdoors for twenty focused minutes."),daily("fit-stretch","Try a new stretch","Fitness","photo","Complete a gentle stretch you have not tried before."),
 daily("out-newstreet","Explore a new street","Outdoors","location","Walk somewhere at least 500 m from recent proof locations."),daily("out-green","Find a green corner","Outdoors","location","Visit a park, garden, riverside, or another calm outdoor place."),daily("out-sky","Photograph the sky","Outdoors","photo","Pause outside and capture a detail in today's sky."),
 daily("soc-hello","Start a friendly conversation","Social","photo","Have a respectful conversation; never photograph anyone without consent."),daily("soc-message","Reconnect with someone","Social","photo","Send a thoughtful message to someone you have not spoken with recently."),daily("soc-thanks","Give a sincere thank-you","Social","either","Thank someone for something specific."),
 daily("cou-new","Do one unfamiliar thing","Courage","photo","Choose a safe small action outside your usual routine."),daily("cou-ask","Ask for feedback","Courage","photo","Ask someone you trust for one useful piece of feedback."),daily("cou-voice","Share an honest opinion","Courage","photo","Express a respectful opinion you would usually keep to yourself."),
 daily("cre-sketch","Make a five-minute sketch","Creativity","photo","Draw anything for five uninterrupted minutes."),daily("cre-photo","Frame an ordinary detail","Creativity","photo","Make an ordinary object interesting in a photograph."),daily("cre-write","Write ten original lines","Creativity","photo","Write ten lines of prose, poetry, or ideas."),
 daily("mind-sit","Sit quietly for ten minutes","Mindfulness","photo","Spend ten minutes without screens or audio."),daily("mind-notice","Notice five details","Mindfulness","location","Visit a place and deliberately notice five sensory details."),daily("mind-journal","Write one honest paragraph","Mindfulness","photo","Write a short reflection about today without editing it."),
];
const landmarkTitles=[
 ["Complete a 45-minute movement session","Set a personal movement best"],["Watch a sunrise outside","Visit a place you have never seen"],["Invite someone for a walk","Have a meaningful offline conversation"],
 ["Try a class or place alone","Do the safe thing you keep postponing"],["Finish a tiny creative project","Share something you created"],["Take a half-day digital reset","Spend thirty minutes in deliberate stillness"],
];
export const LANDMARK_QUESTS:QuestDef[]=ZONES.flatMap((zone,zi)=>landmarkTitles[zi].map((title,qi)=>({id:`landmark-${zi}-${qi}`,title,description:"A one-time discovery quest. No deadline and no penalty.",zone,proof:(zi===1||zi===3?"location":"photo") as ProofKind,kind:"landmark" as const})));
export const ALL_QUESTS=[...DAILY_QUESTS,...LANDMARK_QUESTS];
export const questById=(id:string)=>ALL_QUESTS.find(q=>q.id===id);
export const unlockedTiles=(lifetimeXp:number)=>Math.min(36,1+Math.floor(Math.max(0,lifetimeXp)/100));
export const penaltyAmount=(balance:number,penalty=25)=>balance<=0?0:-Math.min(balance,penalty);
export function dailyOffers(userId:string,date:string,zones:string[],recent:string[]){
 const allowed=zones.length?zones:[...ZONES]; const fresh=DAILY_QUESTS.filter(q=>allowed.includes(q.zone)&&!recent.includes(q.id)); const filtered=DAILY_QUESTS.filter(q=>allowed.includes(q.zone)); const source=fresh.length>=3?fresh:filtered.length>=3?filtered:DAILY_QUESTS;
 let hash=2166136261; for(const char of `${userId}:${date}`) hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return [...source].sort((a,b)=>((hash^a.id.split("").reduce((s,c)=>s+c.charCodeAt(0),0))%997)-((hash^b.id.split("").reduce((s,c)=>s+c.charCodeAt(0),0))%997)).slice(0,3);
}
