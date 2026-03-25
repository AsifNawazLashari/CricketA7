import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Match, Innings } from '../types';
import { subscribeMatches } from '../services/firebase';

interface MatchContextValue {
  allMatches: Match[];
  isLoadingMatches: boolean;
  activeMatchId: string | null;
  activeMatch: Match | null;
  currentInningsIdx: number;
  currentInnings: Innings | null;
  setActiveMatch: (id: string) => void;
  setCurrentInningsIdx: (idx: number) => void;
}

const MatchContext = createContext<MatchContextValue>({
  allMatches: [],
  isLoadingMatches: true,
  activeMatchId: null,
  activeMatch: null,
  currentInningsIdx: 0,
  currentInnings: null,
  setActiveMatch: () => {},
  setCurrentInningsIdx: () => {},
});

export function MatchProvider({ children }: { children: ReactNode }) {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [currentInningsIdx, setCurrentInningsIdx] = useState(0);

  useEffect(() => {
    const unsub = subscribeMatches((matches) => {
      setAllMatches(matches);
      setIsLoadingMatches(false);
    });
    return unsub;
  }, []);

  const activeMatch = activeMatchId ? allMatches.find((m) => m.id === activeMatchId) ?? null : null;
  const currentInnings = activeMatch?.innings?.[currentInningsIdx] ?? null;

  const setActiveMatch = (id: string) => {
    setActiveMatchId(id);
    const match = allMatches.find((m) => m.id === id);
    if (match) {
      const liveInnIdx = match.innings.findIndex((i) => !i.isComplete);
      setCurrentInningsIdx(liveInnIdx >= 0 ? liveInnIdx : Math.max(0, match.innings.length - 1));
    }
  };

  return (
    <MatchContext.Provider value={{
      allMatches,
      isLoadingMatches,
      activeMatchId,
      activeMatch,
      currentInningsIdx,
      currentInnings,
      setActiveMatch,
      setCurrentInningsIdx,
    }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  return useContext(MatchContext);
}
