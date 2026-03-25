import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, Timestamp, serverTimestamp,
  writeBatch, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import {
  Match, Innings, Team, Tournament, Player, BallInput, WicketInput,
  BallType, DismissalType, Commentary, MatchRules, TournamentStanding, PlayerStatsEntry,
  MatchType, MatchFormat,
} from '../types';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const isConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const app = getApps().length === 0
  ? initializeApp(isConfigured ? firebaseConfig : { apiKey: 'placeholder', projectId: 'placeholder', appId: 'placeholder' })
  : getApps()[0];
const db = getFirestore(app);

// ─── Default Rules Factories ───────────────────────────────────────────────────

export function defaultTapeballRules(overs = 10): MatchRules {
  return {
    wideRuns: 1,
    noBallFreeHit: true,
    maxBowlerOvers: Math.ceil(overs / 5),
    drsEnabled: false,
    legByeAllowed: false,
    bouncerLimit: 1,
    ballsPerOver: 6,
  };
}

export function defaultLeatherRules(overs = 50): MatchRules {
  return {
    wideRuns: 1,
    noBallFreeHit: true,
    maxBowlerOvers: Math.ceil(overs / 5),
    drsEnabled: overs >= 20,
    legByeAllowed: true,
    bouncerLimit: overs <= 20 ? 1 : 2,
    ballsPerOver: 6,
  };
}

// ─── Utility Calculations ─────────────────────────────────────────────────────

export function calcCRR(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return parseFloat(((runs / balls) * 6).toFixed(2));
}

export function calcRRR(target: number, runs: number, ballsLeft: number): number {
  if (ballsLeft <= 0) return 0;
  return parseFloat((((target - runs) / ballsLeft) * 6).toFixed(2));
}

export function calcStrikeRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return parseFloat(((runs / balls) * 100).toFixed(1));
}

export function calcEconomy(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return parseFloat(((runs / balls) * 6).toFixed(2));
}

export function formatOvers(balls: number, ballsPerOver = 6): string {
  const overs = Math.floor(balls / ballsPerOver);
  const rem = balls % ballsPerOver;
  return rem === 0 ? `${overs}` : `${overs}.${rem}`;
}

// ─── Match helpers ────────────────────────────────────────────────────────────

function docToMatch(id: string, data: any): Match {
  return {
    id,
    tournamentId: data.tournamentId ?? '',
    tournamentName: data.tournamentName,
    team1Id: data.team1Id ?? '',
    team1Name: data.team1Name ?? '',
    team1Code: data.team1Code ?? '',
    team2Id: data.team2Id ?? '',
    team2Name: data.team2Name ?? '',
    team2Code: data.team2Code ?? '',
    overs: data.overs ?? 10,
    venue: data.venue,
    status: data.status ?? 'scheduled',
    matchType: data.matchType ?? 'tapeball',
    matchFormat: data.matchFormat,
    innings: (data.innings ?? []).map((inn: any) => ({
      ...inn,
      extras: inn.extras ?? 0,
      isFreeHit: inn.isFreeHit ?? false,
      bowling: (inn.bowling ?? []).map((b: any) => ({
        ...b,
        wides: b.wides ?? 0,
        noBalls: b.noBalls ?? 0,
      })),
    })),
    tossWinnerId: data.tossWinnerId,
    tossDecision: data.tossDecision,
    winnerId: data.winnerId,
    resultDesc: data.resultDesc,
    rules: {
      wideRuns: data.rules?.wideRuns ?? 1,
      noBallFreeHit: data.rules?.noBallFreeHit ?? true,
      maxBowlerOvers: data.rules?.maxBowlerOvers ?? 2,
      drsEnabled: data.rules?.drsEnabled ?? false,
      legByeAllowed: data.rules?.legByeAllowed ?? true,
      bouncerLimit: data.rules?.bouncerLimit ?? 1,
      ballsPerOver: data.rules?.ballsPerOver ?? 6,
    },
    stage: data.stage,
    roundNo: data.roundNo,
    scheduledAt: data.scheduledAt,
    createdAt: data.createdAt,
  };
}

// ─── Match CRUD ───────────────────────────────────────────────────────────────

export async function getAllMatches(): Promise<Match[]> {
  try {
    const snap = await getDocs(query(collection(db, 'matches'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => docToMatch(d.id, d.data()));
  } catch {
    return [];
  }
}

export function subscribeMatches(cb: (matches: Match[]) => void): () => void {
  if (!isConfigured) {
    setTimeout(() => cb([]), 100);
    return () => {};
  }
  const timer = setTimeout(() => cb([]), 8000);
  try {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      clearTimeout(timer);
      cb(snap.docs.map((d) => docToMatch(d.id, d.data())));
    }, () => {
      clearTimeout(timer);
      cb([]);
    });
    return () => { clearTimeout(timer); unsub(); };
  } catch {
    clearTimeout(timer);
    cb([]);
    return () => {};
  }
}

export async function getMatch(matchId: string): Promise<Match | null> {
  try {
    const snap = await getDoc(doc(db, 'matches', matchId));
    if (!snap.exists()) return null;
    return docToMatch(snap.id, snap.data());
  } catch {
    return null;
  }
}

export async function getMatchesByTournament(tournamentId: string): Promise<Match[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'matches'), where('tournamentId', '==', tournamentId), orderBy('roundNo', 'asc'))
    );
    return snap.docs.map((d) => docToMatch(d.id, d.data()));
  } catch {
    return [];
  }
}

export async function getUpcomingMatches(): Promise<Match[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'matches'), where('status', '==', 'scheduled'), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => docToMatch(d.id, d.data()));
  } catch {
    return [];
  }
}

export function subscribeUpcomingMatches(cb: (matches: Match[]) => void): () => void {
  if (!isConfigured) { setTimeout(() => cb([]), 100); return () => {}; }
  try {
    const q = query(collection(db, 'matches'), where('status', 'in', ['scheduled', 'toss']), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => docToMatch(d.id, d.data()))), () => cb([]));
  } catch {
    cb([]);
    return () => {};
  }
}

export async function createMatch(data: Omit<Match, 'id' | 'status' | 'innings'>): Promise<Match> {
  const matchData = {
    ...data,
    status: 'scheduled',
    innings: [],
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'matches'), matchData);
  return { id: ref.id, ...matchData, innings: [], status: 'scheduled' } as Match;
}

export async function updateMatchSchedule(matchId: string, scheduledAt: string, venue: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), { scheduledAt, venue });
}

export async function recordToss(matchId: string, winnerId: string, decision: 'bat' | 'bowl'): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    tossWinnerId: winnerId,
    tossDecision: decision,
    status: 'toss',
  });
}

export async function startInnings(
  matchId: string,
  inningsNo: 1 | 2,
  battingTeamId: string,
  bowlingTeamId: string,
  strikerId: string,
  strikerName: string,
  nonStrikerId: string,
  nonStrikerName: string,
  bowlerId: string,
  bowlerName: string,
  rules?: MatchRules,
): Promise<void> {
  const innings: Innings = {
    id: `inn_${inningsNo}_${Date.now()}`,
    inningsNo,
    battingTeamId,
    bowlingTeamId,
    runs: 0,
    wickets: 0,
    balls: 0,
    extras: 0,
    batting: [
      { playerId: strikerId, playerName: strikerName, runs: 0, balls: 0, fours: 0, sixes: 0, isStriker: true, isOut: false },
      { playerId: nonStrikerId, playerName: nonStrikerName, runs: 0, balls: 0, fours: 0, sixes: 0, isStriker: false, isOut: false },
    ],
    bowling: [
      { playerId: bowlerId, playerName: bowlerName, balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, isActive: true },
    ],
    isComplete: false,
    isFreeHit: false,
  };

  const snap = await getDoc(doc(db, 'matches', matchId));
  const existing = snap.data()?.innings ?? [];
  await updateDoc(doc(db, 'matches', matchId), {
    innings: [...existing, innings],
    status: 'live',
  });
}

export async function recordBall(matchId: string, inningsId: string, ball: BallInput): Promise<void> {
  const snap = await getDoc(doc(db, 'matches', matchId));
  if (!snap.exists()) return;
  const match = docToMatch(snap.id, snap.data());
  const innIdx = match.innings.findIndex((i) => i.id === inningsId);
  if (innIdx === -1) return;

  const inn = { ...match.innings[innIdx] };
  const ballsPerOver = match.rules?.ballsPerOver ?? 6;
  const isWide = ball.type === 'wide';
  const isNoBall = ball.type === 'noball';
  const isBye = ball.type === 'bye';
  const isLegBye = ball.type === 'legbye';
  const isExtra = isWide || isNoBall;
  const countsBall = !isExtra;

  if (countsBall) inn.balls += 1;
  inn.runs += ball.runs;

  if (isWide || isNoBall || isBye || isLegBye) {
    inn.extras = (inn.extras ?? 0) + ball.runs;
  }

  const nextIsFreeHit = isNoBall && match.rules.noBallFreeHit;
  inn.isFreeHit = nextIsFreeHit;

  const batIdx = inn.batting.findIndex((b) => b.playerId === ball.strikerId);
  if (batIdx !== -1 && countsBall && !isBye && !isLegBye) {
    const bat = { ...inn.batting[batIdx] };
    bat.runs += ball.runs;
    bat.balls += 1;
    if (ball.runs === 4) bat.fours += 1;
    if (ball.runs === 6) bat.sixes += 1;
    inn.batting = inn.batting.map((b, i) => i === batIdx ? bat : b);
  } else if (batIdx !== -1 && countsBall && (isBye || isLegBye)) {
    const bat = { ...inn.batting[batIdx] };
    bat.balls += 1;
    inn.batting = inn.batting.map((b, i) => i === batIdx ? bat : b);
  }

  const bowlIdx = inn.bowling.findIndex((b) => b.playerId === ball.bowlerId && b.isActive);
  if (bowlIdx !== -1) {
    const bowl = { ...inn.bowling[bowlIdx] };
    if (isWide) { bowl.wides = (bowl.wides ?? 0) + 1; bowl.runs += ball.runs; }
    else if (isNoBall) { bowl.noBalls = (bowl.noBalls ?? 0) + 1; bowl.runs += 1; }
    else if (!isBye && !isLegBye) { bowl.runs += ball.runs; bowl.balls += 1; }
    else { bowl.balls += 1; }
    inn.bowling = inn.bowling.map((b, i) => i === bowlIdx ? bowl : b);
  }

  if (countsBall && inn.balls % ballsPerOver === 0 && inn.balls > 0) {
    const oddRuns = ball.runs % 2 !== 0;
    if (!oddRuns) {
      inn.batting = inn.batting.map((b) => ({ ...b, isStriker: !b.isStriker }));
    }
  } else if (countsBall) {
    const oddRuns = ball.runs % 2 !== 0;
    if (oddRuns) {
      inn.batting = inn.batting.map((b) => ({ ...b, isStriker: !b.isStriker }));
    }
  }

  if (isWide || isNoBall) {
    const oddRuns = ball.runs % 2 !== 0;
    if (oddRuns) {
      inn.batting = inn.batting.map((b) => ({ ...b, isStriker: !b.isStriker }));
    }
  }

  const updatedInnings = match.innings.map((i, idx) => idx === innIdx ? inn : i);
  await updateDoc(doc(db, 'matches', matchId), { innings: updatedInnings });

  const eventType = isWide ? 'wide'
    : isNoBall ? 'noball'
    : isBye ? 'bye'
    : isLegBye ? 'legbye'
    : ball.runs === 4 ? 'four'
    : ball.runs === 6 ? 'six'
    : ball.runs === 0 ? 'dot'
    : 'run';

  const commentary: Omit<Commentary, 'id'> = {
    matchId,
    inningsId,
    overNo: ball.overNo,
    ballNo: ball.ballNo,
    eventType: eventType as any,
    runs: ball.runs,
    strikerName: ball.strikerName,
    bowlerName: ball.bowlerName,
    text: buildCommentaryText(ball, eventType, !!ball.isFreeHit),
    timestamp: null,
  };
  await addDoc(collection(db, 'matches', matchId, 'commentary'), {
    ...commentary,
    timestamp: serverTimestamp(),
  });
}

function buildCommentaryText(ball: BallInput, eventType: string, isFreeHit: boolean): string {
  const { strikerName, bowlerName, runs } = ball;
  const fhPrefix = isFreeHit ? '🟡 FREE HIT! ' : '';
  switch (eventType) {
    case 'four': return `${fhPrefix}FOUR! ${strikerName} drives ${bowlerName} for a boundary! 🔵`;
    case 'six': return `${fhPrefix}SIX! ${strikerName} smashes ${bowlerName} over the ropes! 🟡`;
    case 'wide': return `Wide ball by ${bowlerName}. +${runs} run(s).`;
    case 'noball': return `No-ball by ${bowlerName}! FREE HIT to follow 🟡`;
    case 'bye': return `Bye — ${runs} run(s) taken.`;
    case 'legbye': return `Leg bye — ${runs} run(s) taken.`;
    case 'dot': return `${fhPrefix}Dot ball. ${bowlerName} beats ${strikerName}.`;
    default: return `${fhPrefix}${strikerName} takes ${runs} run(s) off ${bowlerName}.`;
  }
}

export async function recordWicket(matchId: string, inningsId: string, wicket: WicketInput): Promise<void> {
  const snap = await getDoc(doc(db, 'matches', matchId));
  if (!snap.exists()) return;
  const match = docToMatch(snap.id, snap.data());
  const innIdx = match.innings.findIndex((i) => i.id === inningsId);
  if (innIdx === -1) return;

  const inn = { ...match.innings[innIdx] };

  if (wicket.isFreeHit && !['run_out', 'handled_ball', 'obstructing'].includes(wicket.dismissal)) {
    return;
  }

  inn.balls += 1;
  inn.wickets += 1;
  inn.isFreeHit = false;

  const dismissalText = (() => {
    switch (wicket.dismissal) {
      case 'bowled': return `b ${wicket.bowlerName}`;
      case 'caught': return `c ${wicket.fielderName ?? 'fielder'} b ${wicket.bowlerName}`;
      case 'lbw': return `lbw b ${wicket.bowlerName}`;
      case 'run_out': return `run out (${wicket.fielderName ?? 'fielder'})`;
      case 'stumped': return `st ${wicket.fielderName ?? 'wk'} b ${wicket.bowlerName}`;
      case 'hit_wicket': return `hit wicket b ${wicket.bowlerName}`;
      case 'retired_hurt': return `retired hurt`;
      default: return wicket.dismissal;
    }
  })();

  inn.batting = inn.batting.map((b) => {
    if (b.playerId === wicket.strikerId) {
      return { ...b, isOut: true, isStriker: false, dismissal: dismissalText, balls: b.balls + 1 };
    }
    return b;
  });

  if (wicket.newBatsmanId && wicket.newBatsmanName) {
    inn.batting.push({
      playerId: wicket.newBatsmanId,
      playerName: wicket.newBatsmanName,
      runs: 0, balls: 0, fours: 0, sixes: 0,
      isStriker: true, isOut: false,
    });
  }

  const bowlIdx = inn.bowling.findIndex((b) => b.playerId === wicket.bowlerId && b.isActive);
  if (bowlIdx !== -1 && !['run_out', 'retired_hurt', 'handled_ball', 'obstructing'].includes(wicket.dismissal)) {
    const bowl = { ...inn.bowling[bowlIdx] };
    bowl.balls += 1;
    bowl.wickets += 1;
    inn.bowling = inn.bowling.map((b, i) => i === bowlIdx ? bowl : b);
  } else if (bowlIdx !== -1) {
    const bowl = { ...inn.bowling[bowlIdx] };
    bowl.balls += 1;
    inn.bowling = inn.bowling.map((b, i) => i === bowlIdx ? bowl : b);
  }

  const updatedInnings = match.innings.map((i, idx) => idx === innIdx ? inn : i);
  await updateDoc(doc(db, 'matches', matchId), { innings: updatedInnings });

  await addDoc(collection(db, 'matches', matchId, 'commentary'), {
    matchId, inningsId,
    overNo: wicket.overNo, ballNo: wicket.ballNo,
    eventType: 'wicket', runs: 0,
    strikerName: wicket.strikerName, bowlerName: wicket.bowlerName,
    text: `🔴 WICKET! ${wicket.strikerName} — ${dismissalText}`,
    timestamp: serverTimestamp(),
  });
}

export async function changeBowler(matchId: string, inningsId: string, bowlerId: string, bowlerName: string): Promise<void> {
  const snap = await getDoc(doc(db, 'matches', matchId));
  if (!snap.exists()) return;
  const match = docToMatch(snap.id, snap.data());
  const innIdx = match.innings.findIndex((i) => i.id === inningsId);
  if (innIdx === -1) return;

  const inn = { ...match.innings[innIdx] };
  inn.bowling = inn.bowling.map((b) => ({ ...b, isActive: false }));

  const existing = inn.bowling.find((b) => b.playerId === bowlerId);
  if (existing) {
    inn.bowling = inn.bowling.map((b) => b.playerId === bowlerId ? { ...b, isActive: true } : b);
  } else {
    inn.bowling.push({ playerId: bowlerId, playerName: bowlerName, balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, isActive: true });
  }

  const updatedInnings = match.innings.map((i, idx) => idx === innIdx ? inn : i);
  await updateDoc(doc(db, 'matches', matchId), { innings: updatedInnings });
}

export async function completeInnings(matchId: string, inningsId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'matches', matchId));
  if (!snap.exists()) return;
  const match = docToMatch(snap.id, snap.data());
  const innIdx = match.innings.findIndex((i) => i.id === inningsId);
  if (innIdx === -1) return;

  const inn = { ...match.innings[innIdx], isComplete: true };
  const updatedInnings = match.innings.map((i, idx) => idx === innIdx ? inn : i);
  const newStatus = inn.inningsNo === 1 ? 'innings_break' : 'completed';
  await updateDoc(doc(db, 'matches', matchId), { innings: updatedInnings, status: newStatus });
}

export async function endMatch(matchId: string, winnerId: string | null, desc: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'completed',
    winnerId,
    resultDesc: desc,
  });
  if (winnerId) {
    const snap = await getDoc(doc(db, 'matches', matchId));
    if (snap.exists()) {
      const m = docToMatch(snap.id, snap.data());
      if (m.tournamentId) {
        await updateTournamentStandings(m);
      }
    }
  }
}

async function updateTournamentStandings(match: Match): Promise<void> {
  if (!match.tournamentId || !match.winnerId) return;
  try {
    const inn1 = match.innings[0];
    const inn2 = match.innings[1];
    if (!inn1 || !inn2) return;

    const team1Runs = match.innings.filter(i => i.battingTeamId === match.team1Id).reduce((s, i) => s + i.runs, 0);
    const team2Runs = match.innings.filter(i => i.battingTeamId === match.team2Id).reduce((s, i) => s + i.runs, 0);
    const team1Balls = match.innings.filter(i => i.battingTeamId === match.team1Id).reduce((s, i) => s + i.balls, 0);
    const team2Balls = match.innings.filter(i => i.battingTeamId === match.team2Id).reduce((s, i) => s + i.balls, 0);
    const totalBalls = match.overs * (match.rules?.ballsPerOver ?? 6);

    const t1RR = team1Balls > 0 ? (team1Runs / team1Balls) * 6 : 0;
    const t2RR = team2Balls > 0 ? (team2Runs / team2Balls) * 6 : 0;
    const team1NRR = t1RR - t2RR;
    const team2NRR = t2RR - t1RR;

    const tRef = doc(db, 'standings', `${match.tournamentId}_${match.team1Id}`);
    const tSnap = await getDoc(tRef);
    const existing1 = tSnap.exists() ? tSnap.data() : { played: 0, won: 0, lost: 0, tied: 0, nrr: 0, points: 0 };
    await updateDoc(tRef.parent.doc ? tRef : doc(db, 'standings', `${match.tournamentId}_${match.team1Id}`), {
      tournamentId: match.tournamentId,
      teamId: match.team1Id,
      teamName: match.team1Name,
      played: (existing1.played || 0) + 1,
      won: (existing1.won || 0) + (match.winnerId === match.team1Id ? 1 : 0),
      lost: (existing1.lost || 0) + (match.winnerId !== match.team1Id ? 1 : 0),
      tied: existing1.tied || 0,
      nrr: parseFloat((((existing1.nrr || 0) * (existing1.played || 0) + team1NRR) / ((existing1.played || 0) + 1)).toFixed(3)),
      points: (existing1.points || 0) + (match.winnerId === match.team1Id ? 2 : 0),
    }).catch(() => addDoc(collection(db, 'standings'), {
      tournamentId: match.tournamentId,
      teamId: match.team1Id,
      teamName: match.team1Name,
      played: 1,
      won: match.winnerId === match.team1Id ? 1 : 0,
      lost: match.winnerId !== match.team1Id ? 1 : 0,
      tied: 0,
      nrr: team1NRR,
      points: match.winnerId === match.team1Id ? 2 : 0,
    }));
  } catch {}
}

// ─── Commentary ───────────────────────────────────────────────────────────────

export function subscribeCommentary(matchId: string, cb: (items: Commentary[]) => void): () => void {
  try {
    const q = query(
      collection(db, 'matches', matchId, 'commentary'),
      orderBy('timestamp', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Commentary)));
    }, () => cb([]));
  } catch {
    cb([]);
    return () => {};
  }
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getAllTeams(): Promise<Team[]> {
  try {
    const snap = await getDocs(query(collection(db, 'teams'), orderBy('name', 'asc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
  } catch {
    return [];
  }
}

export function subscribeTeams(cb: (teams: Team[]) => void): () => void {
  if (!isConfigured) { setTimeout(() => cb([]), 100); return () => {}; }
  try {
    const q = query(collection(db, 'teams'), orderBy('name', 'asc'));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team))), () => cb([]));
  } catch {
    cb([]);
    return () => {};
  }
}

export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const snap = await getDoc(doc(db, 'teams', teamId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Team;
  } catch {
    return null;
  }
}

export async function getTeamsByTournament(tournamentId: string): Promise<Team[]> {
  try {
    const snap = await getDocs(query(collection(db, 'teams'), where('tournamentId', '==', tournamentId)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
  } catch {
    return [];
  }
}

export async function createTeam(data: Omit<Team, 'id' | 'players'>): Promise<Team> {
  const teamData = { ...data, players: [] };
  const ref = await addDoc(collection(db, 'teams'), teamData);
  return { id: ref.id, ...teamData };
}

export async function updateTeam(teamId: string, data: Partial<Pick<Team, 'name' | 'code' | 'color' | 'matchType'>>): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId), data);
}

export async function deleteTeam(teamId: string): Promise<void> {
  await deleteDoc(doc(db, 'teams', teamId));
}

export async function addPlayer(teamId: string, player: Omit<Player, 'id'>): Promise<void> {
  const p: Player = {
    ...player,
    id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  };
  await updateDoc(doc(db, 'teams', teamId), { players: arrayUnion(p) });
}

export async function removePlayer(teamId: string, playerId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'teams', teamId));
  if (!snap.exists()) return;
  const team = { id: snap.id, ...snap.data() } as Team;
  const updated = team.players.filter((p) => p.id !== playerId);
  await updateDoc(doc(db, 'teams', teamId), { players: updated });
}

export async function updatePlayer(teamId: string, player: Player): Promise<void> {
  const snap = await getDoc(doc(db, 'teams', teamId));
  if (!snap.exists()) return;
  const team = { id: snap.id, ...snap.data() } as Team;
  const updated = team.players.map((p) => p.id === player.id ? player : p);
  await updateDoc(doc(db, 'teams', teamId), { players: updated });
}

// ─── Tournaments ──────────────────────────────────────────────────────────────

export async function getTournaments(): Promise<Tournament[]> {
  try {
    const snap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
  } catch {
    return [];
  }
}

export function subscribeTournaments(cb: (ts: Tournament[]) => void): () => void {
  if (!isConfigured) { setTimeout(() => cb([]), 100); return () => {}; }
  try {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament))), () => cb([]));
  } catch {
    cb([]);
    return () => {};
  }
}

export async function createTournament(data: Omit<Tournament, 'id'>): Promise<Tournament> {
  const ref = await addDoc(collection(db, 'tournaments'), { ...data, createdAt: serverTimestamp() });
  return { id: ref.id, ...data };
}

export async function getTournamentStandings(tournamentId: string): Promise<TournamentStanding[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'standings'), where('tournamentId', '==', tournamentId))
    );
    const rows = snap.docs.map((d) => d.data() as TournamentStanding);
    return rows.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  } catch {
    return [];
  }
}

export function computeStandingsFromMatches(matches: Match[]): TournamentStanding[] {
  const map = new Map<string, TournamentStanding>();

  for (const m of matches) {
    if (m.status !== 'completed') continue;

    [
      { id: m.team1Id, name: m.team1Name },
      { id: m.team2Id, name: m.team2Name },
    ].forEach(({ id, name }) => {
      if (!map.has(id)) {
        map.set(id, { teamId: id, teamName: name, played: 0, won: 0, lost: 0, tied: 0, nrr: 0, points: 0 });
      }
    });

    const t1 = map.get(m.team1Id)!;
    const t2 = map.get(m.team2Id)!;
    t1.played += 1;
    t2.played += 1;

    if (m.winnerId === m.team1Id) { t1.won += 1; t1.points += 2; t2.lost += 1; }
    else if (m.winnerId === m.team2Id) { t2.won += 1; t2.points += 2; t1.lost += 1; }
    else { t1.tied += 1; t2.tied += 1; t1.points += 1; t2.points += 1; }
  }

  return Array.from(map.values()).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
}

export function computePlayerStats(matches: Match[]): PlayerStatsEntry[] {
  const map = new Map<string, PlayerStatsEntry>();

  for (const m of matches) {
    for (const inn of m.innings) {
      const battingTeam = inn.battingTeamId === m.team1Id ? m.team1Name : m.team2Name;
      for (const bat of inn.batting) {
        const key = `${bat.playerId}_bat`;
        const prev = map.get(key);
        if (!prev) {
          map.set(key, {
            playerId: bat.playerId, playerName: bat.playerName, teamName: battingTeam,
            matchId: m.id, runs: bat.runs, balls: bat.balls, fours: bat.fours, sixes: bat.sixes,
            wickets: 0, runsConceded: 0, ballsBowled: 0,
            strikeRate: bat.balls > 0 ? (bat.runs / bat.balls) * 100 : 0,
            economy: 0, isOut: bat.isOut,
          });
        } else {
          prev.runs += bat.runs; prev.balls += bat.balls;
          prev.fours += bat.fours; prev.sixes += bat.sixes;
          prev.strikeRate = prev.balls > 0 ? (prev.runs / prev.balls) * 100 : 0;
        }
      }
      const bowlingTeam = inn.bowlingTeamId === m.team1Id ? m.team1Name : m.team2Name;
      for (const bowl of inn.bowling) {
        const key = `${bowl.playerId}_bowl`;
        const prev = map.get(key);
        if (!prev) {
          map.set(key, {
            playerId: bowl.playerId, playerName: bowl.playerName, teamName: bowlingTeam,
            matchId: m.id, runs: 0, balls: 0, fours: 0, sixes: 0,
            wickets: bowl.wickets, runsConceded: bowl.runs, ballsBowled: bowl.balls,
            strikeRate: 0, economy: bowl.balls > 0 ? (bowl.runs / bowl.balls) * 6 : 0, isOut: false,
          });
        } else {
          prev.wickets += bowl.wickets; prev.runsConceded += bowl.runs; prev.ballsBowled += bowl.balls;
          prev.economy = prev.ballsBowled > 0 ? (prev.runsConceded / prev.ballsBowled) * 6 : 0;
        }
      }
    }
  }

  return Array.from(map.values());
}
