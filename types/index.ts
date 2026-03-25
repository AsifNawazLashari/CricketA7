import { Timestamp } from 'firebase/firestore';

export type UserRole = 'developer' | 'organizer' | 'captain' | 'viewer';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  teamId?: string;
}

export interface Player {
  id: string;
  name: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  jerseyNo?: number;
  battingStyle?: 'right' | 'left';
  bowlingStyle?: string;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  color: string;
  tournamentId: string;
  players: Player[];
  matchType?: 'tapeball' | 'leather';
}

export type TournamentFormat = 'knockout' | 'league' | 'hybrid';
export type MatchFormat = 'T6' | 'T8' | 'T10' | 'T20' | 'ODI' | 'Test' | 'custom';
export type MatchType = 'tapeball' | 'leather';

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  matchFormat?: MatchFormat;
  matchType?: MatchType;
  overs: number;
  venue?: string;
  totalTeams?: number;
  createdAt?: Timestamp;
}

export type MatchStatus = 'scheduled' | 'toss' | 'live' | 'innings_break' | 'completed' | 'abandoned';

export interface MatchRules {
  wideRuns: number;
  noBallFreeHit: boolean;
  maxBowlerOvers: number;
  drsEnabled: boolean;
  legByeAllowed: boolean;
  bouncerLimit: number;
  ballsPerOver: number;
}

export interface BattingRecord {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isStriker: boolean;
  isOut: boolean;
  dismissal?: string;
}

export interface BowlingRecord {
  playerId: string;
  playerName: string;
  balls: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
  isActive: boolean;
}

export interface Innings {
  id: string;
  inningsNo: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  balls: number;
  extras: number;
  batting: BattingRecord[];
  bowling: BowlingRecord[];
  isComplete: boolean;
  isFreeHit?: boolean;
}

export interface Match {
  id: string;
  tournamentId: string;
  tournamentName?: string;
  team1Id: string;
  team1Name: string;
  team1Code: string;
  team2Id: string;
  team2Name: string;
  team2Code: string;
  overs: number;
  venue?: string;
  status: MatchStatus;
  matchType: MatchType;
  matchFormat?: MatchFormat;
  innings: Innings[];
  tossWinnerId?: string;
  tossDecision?: 'bat' | 'bowl';
  winnerId?: string | null;
  resultDesc?: string;
  rules: MatchRules;
  stage?: string;
  roundNo?: number;
  scheduledAt?: string;
  createdAt?: Timestamp;
}

export type BallType = 'normal' | 'wide' | 'noball' | 'bye' | 'legbye';
export type DismissalType = 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped' | 'hit_wicket' | 'retired_hurt' | 'handled_ball' | 'obstructing';

export interface BallInput {
  runs: number;
  type: BallType;
  strikerId: string;
  strikerName: string;
  bowlerId: string;
  bowlerName: string;
  overNo: number;
  ballNo: number;
  isFreeHit?: boolean;
}

export interface WicketInput {
  strikerId: string;
  strikerName: string;
  bowlerId: string;
  bowlerName: string;
  dismissal: DismissalType;
  fielderName?: string;
  newBatsmanId?: string;
  newBatsmanName?: string;
  overNo: number;
  ballNo: number;
  isFreeHit?: boolean;
}

export interface Commentary {
  id: string;
  matchId: string;
  inningsId: string;
  overNo: number;
  ballNo: number;
  eventType: 'dot' | 'run' | 'four' | 'six' | 'wicket' | 'wide' | 'noball' | 'bye' | 'legbye' | 'freehit';
  runs: number;
  text: string;
  strikerName: string;
  bowlerName: string;
  timestamp: Timestamp | null;
}

export interface PlayerStatsEntry {
  playerId: string;
  playerName: string;
  teamName: string;
  matchId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets: number;
  runsConceded: number;
  ballsBowled: number;
  strikeRate: number;
  economy: number;
  isOut: boolean;
}

export interface TournamentStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  nrr: number;
  points: number;
}

// Extended AppUser with teamId for captains
declare module './index' {}
