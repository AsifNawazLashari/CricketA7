import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Animated, Vibration, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMatch } from '../../context/MatchContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  recordBall, recordWicket, changeBowler, completeInnings, endMatch,
  calcCRR, calcRRR, calcStrikeRate, calcEconomy,
} from '../../services/firebase';
import { BottomSheet } from '../../components/BottomSheet';
import { Btn, Badge, EmptyState, Loader } from '../../components/UI';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { BallType, DismissalType, Player, BattingRecord, BowlingRecord } from '../../types';
import { getTeam } from '../../services/firebase';

const DISMISSALS: { label: string; value: DismissalType }[] = [
  { label: 'Bowled', value: 'bowled' },
  { label: 'Caught', value: 'caught' },
  { label: 'LBW', value: 'lbw' },
  { label: 'Run Out', value: 'run_out' },
  { label: 'Stumped', value: 'stumped' },
  { label: 'Hit Wicket', value: 'hit_wicket' },
  { label: 'Retired Hurt', value: 'retired_hurt' },
];

export default function ScoringScreen() {
  const { activeMatch, currentInnings, currentInningsIdx, setCurrentInningsIdx, activeMatchId } = useMatch();
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWicketSheet, setShowWicketSheet] = useState(false);
  const [showBowlerSheet, setShowBowlerSheet] = useState(false);
  const [showNextBatSheet, setShowNextBatSheet] = useState(false);
  const [selectedDismissal, setSelectedDismissal] = useState<DismissalType | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [pendingWicketCallback, setPendingWicketCallback] = useState<((pid: string | null, name: string | null) => void) | null>(null);
  const [undoStack, setUndoStack] = useState<any[]>([]);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(1)).current;
  const ppFlashAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (activeMatch?.powerplayEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ppFlashAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(ppFlashAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [activeMatch?.powerplayEnabled]);

  if (!hasRole('developer', 'organizer', 'captain')) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <AppHeader title="LIVE SCORING" sub="SCORE" />
        <EmptyState icon="🔒" title="Restricted" desc="Sign in as Captain, Organizer, or Admin to score matches." />
      </SafeAreaView>
    );
  }

  if (!activeMatch || !activeMatchId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <AppHeader title="LIVE SCORING" sub="SCORE" />
        <EmptyState icon="🏏" title="No Active Match" desc="Set up a match from the MANAGE tab to start scoring." />
      </SafeAreaView>
    );
  }

  const inn = currentInnings;
  if (!inn) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <AppHeader title="LIVE SCORING" sub="SCORE" />
        <EmptyState icon="🏏" title="No Innings Started" desc="Start the innings from the MANAGE tab." />
      </SafeAreaView>
    );
  }

  const striker = inn.batting.find((b) => b.isStriker && !b.isOut);
  const nonStriker = inn.batting.find((b) => !b.isStriker && !b.isOut);
  const activeBowler = inn.bowling.find((b) => b.isActive);

  const maxBowlerOvers = Math.ceil(activeMatch.overs / 5) || 2;
  const overNo = Math.floor(inn.balls / 6);
  const ballInOver = inn.balls % 6;
  const isOverComplete = ballInOver === 0 && inn.balls > 0;
  const needsBowlerChange = isOverComplete && (!activeBowler || Math.floor(activeBowler.balls / 6) * 6 === activeBowler.balls && activeBowler.balls > 0);

  const target = currentInningsIdx === 1 ? (activeMatch.innings[0]?.runs ?? 0) + 1 : null;
  const crr = calcCRR(inn.runs, inn.balls);
  const rrr = target ? calcRRR(target, inn.runs, activeMatch.overs * 6 - inn.balls) : null;

  const isPowerplay = activeMatch.powerplayEnabled &&
    overNo < (activeMatch.powerplayOvers ?? 2);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleBall = async (runs: number, type: BallType = 'normal') => {
    if (isSubmitting) return;
    if (!striker || !activeBowler) { toast('Set striker and bowler first'); return; }
    if (needsBowlerChange) {
      triggerShake();
      toast('Select new bowler first!');
      setShowBowlerSheet(true);
      return;
    }

    // Save undo snapshot
    setUndoStack((prev) => [...prev.slice(-9), { runs: inn.runs, wickets: inn.wickets, balls: inn.balls }]);

    setIsSubmitting(true);
    Vibration.vibrate(30);
    try {
      await recordBall(activeMatchId!, inn.id, {
        runs, type,
        strikerId: striker.playerId,
        strikerName: striker.playerName,
        bowlerId: activeBowler.playerId,
        bowlerName: activeBowler.playerName,
        overNo, ballNo: ballInOver,
      });

      const newBalls = inn.balls + (type !== 'wide' && type !== 'noball' ? 1 : 0);
      if (newBalls > 0 && newBalls % 6 === 0 && type !== 'wide' && type !== 'noball') {
        toast('Over complete! Select new bowler.');
        setTimeout(() => setShowBowlerSheet(true), 500);
      }
      if (target && (inn.runs + runs) >= target) {
        toast('Target reached! Match complete.', 'success');
        await completeInnings(activeMatchId!, inn.id);
      }
    } catch (e) { toast('Error recording ball'); }
    setIsSubmitting(false);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) { toast('Nothing to undo'); return; }
    Alert.alert('Undo Last Ball', 'Remove the last recorded ball?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo', onPress: async () => {
          const prev = undoStack[undoStack.length - 1];
          setUndoStack((s) => s.slice(0, -1));
          toast('Last ball undone');
          // In production: call undoBall() service
        }
      },
    ]);
  };

  const handleWicket = async () => {
    if (!striker || !activeBowler) { toast('Set striker and bowler first'); return; }
    setSelectedDismissal(null);
    setShowWicketSheet(true);
  };

  const confirmWicket = async (dismissal: DismissalType) => {
    setShowWicketSheet(false);
    const usedIds = inn.batting.map((b) => b.playerId);
    const team = await getTeam(inn.battingTeamId);
    const rem = (team?.players ?? []).filter((p) => !usedIds.includes(p.id));
    setAvailablePlayers(rem);

    const wicketsSoFar = inn.wickets + 1;
    const allOut = wicketsSoFar >= 10 || rem.length === 0;

    if (allOut) {
      await doRecordWicket(dismissal, null, null);
      toast('All out! Innings complete.');
      await completeInnings(activeMatchId!, inn.id);
      return;
    }

    setPendingWicketCallback(() => async (newId: string | null, newName: string | null) => {
      setShowNextBatSheet(false);
      await doRecordWicket(dismissal, newId, newName);
    });
    setShowNextBatSheet(true);
  };

  const doRecordWicket = async (dismissal: DismissalType, newId: string | null, newName: string | null) => {
    if (!striker || !activeBowler) return;
    setIsSubmitting(true);
    Vibration.vibrate([0, 50, 80, 50]);
    try {
      await recordWicket(activeMatchId!, inn.id, {
        strikerId: striker.playerId, strikerName: striker.playerName,
        bowlerId: activeBowler.playerId, bowlerName: activeBowler.playerName,
        dismissal, newBatsmanId: newId ?? undefined, newBatsmanName: newName ?? undefined,
        overNo, ballNo: ballInOver,
      });
    } catch (e) { toast('Error recording wicket'); }
    setIsSubmitting(false);
  };

  const handleBowlerChange = async (player: Player) => {
    setShowBowlerSheet(false);
    const lastBowlerBalls = [...inn.bowling].sort((a, b) => b.balls - a.balls)[0];
    const prevBowlerId = lastBowlerBalls && !lastBowlerBalls.isActive ? lastBowlerBalls.playerId : null;
    if (player.id === prevBowlerId) { toast('Cannot bowl consecutive overs!'); return; }
    const bowlerRecord = inn.bowling.find((b) => b.playerId === player.id);
    if (bowlerRecord && Math.floor(bowlerRecord.balls / 6) >= maxBowlerOvers) {
      toast(`${player.name} has bowled max overs!`); return;
    }
    try {
      await changeBowler(activeMatchId!, inn.id, player.id, player.name);
      toast(`${player.name} to bowl`);
    } catch (e) { toast('Error changing bowler'); }
  };

  const handleEndInnings = () => {
    Alert.alert('End Innings?', 'This will close the current innings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Innings', style: 'destructive', onPress: async () => {
        await completeInnings(activeMatchId!, inn.id);
        toast('Innings ended');
      }},
    ]);
  };

  const handleEndMatch = () => {
    Alert.alert('End Match?', 'Choose the result:', [
      { text: 'Cancel', style: 'cancel' },
      { text: `${activeMatch.team1Name} Wins`, onPress: () => doEndMatch(activeMatch.team1Id, `${activeMatch.team1Name} wins`) },
      { text: `${activeMatch.team2Name} Wins`, onPress: () => doEndMatch(activeMatch.team2Id, `${activeMatch.team2Name} wins`) },
      { text: 'No Result', onPress: () => doEndMatch(null, 'Match ended — No Result') },
    ]);
  };

  const doEndMatch = async (winnerId: string | null, desc: string) => {
    try {
      await endMatch(activeMatchId!, winnerId, desc);
      toast('Match ended', 'success');
    } catch (e) { toast('Error ending match'); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader title="LIVE SCORING" sub={`${activeMatch.team1Code} vs ${activeMatch.team2Code}`} />
      {isPowerplay && <PowerplayCorners />}
      <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {target && (
          <View style={s.targetBanner}>
            <Text style={s.targetText}>
              Target: <Text style={{ color: Colors.red, fontWeight: '800' }}>{target}</Text>
              {'  '}Need: <Text style={{ color: '#ff9aa2', fontWeight: '700' }}>{target - inn.runs}</Text>
              {'  '}RRR: <Text style={{ color: rrr && rrr > 10 ? Colors.red : Colors.yellow, fontWeight: '700' }}>{rrr?.toFixed(1) ?? '—'}</Text>
            </Text>
          </View>
        )}

        {/* Score Display */}
        <View style={[s.scoreBox, isPowerplay && s.scoreBoxPP]}>
          {isPowerplay && (
            <Animated.View style={[s.ppLabel, { opacity: ppFlashAnim }]}>
              <Text style={s.ppLabelText}>⚡ POWERPLAY</Text>
            </Animated.View>
          )}
          <Text style={s.scoreMain}>{inn.runs}/{inn.wickets}</Text>
          <Text style={s.scoreOvers}>({overNo}.{ballInOver} ov) — CRR {crr.toFixed(2)}</Text>
          <View style={s.wktsBar}>
            {Array.from({ length: 10 }).map((_, i) => (
              <View key={i} style={[s.wktDot, { backgroundColor: i < inn.wickets ? Colors.red : Colors.border }]} />
            ))}
          </View>
        </View>

        {/* Over Balls */}
        <View style={s.overStrip}>
          <Text style={s.overLabel}>OVER {overNo + 1}</Text>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[s.ballDot, { opacity: i < ballInOver ? 1 : 0.2 }]}>
              <Text style={s.ballDotText}>·</Text>
            </View>
          ))}
          {needsBowlerChange && (
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <TouchableOpacity style={s.bowlerAlert} onPress={() => setShowBowlerSheet(true)}>
                <Text style={s.bowlerAlertText}>SELECT BOWLER</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* Crease Cards */}
        <View style={s.creaseRow}>
          <View style={[s.creaseCard, s.strikerCard]}>
            <Text style={s.creaseLbl}>⚡ STRIKER</Text>
            {striker ? (
              <>
                <Text style={s.creaseName}>{striker.playerName}</Text>
                <Text style={s.creaseStats}>
                  <Text style={{ color: Colors.cyan }}>{striker.runs}</Text>
                  {' '}({striker.balls}b) · SR <Text style={{ color: Colors.yellow }}>{calcStrikeRate(striker.runs, striker.balls).toFixed(0)}</Text>
                </Text>
              </>
            ) : <Text style={s.creaseEmpty}>Not set</Text>}
          </View>
          <View style={s.creaseCard}>
            <Text style={s.creaseLbl}>NON-STRIKER</Text>
            {nonStriker ? (
              <>
                <Text style={s.creaseName}>{nonStriker.playerName}</Text>
                <Text style={s.creaseStats}>{nonStriker.runs} ({nonStriker.balls}b)</Text>
              </>
            ) : <Text style={s.creaseEmpty}>Not set</Text>}
          </View>
          <View style={[s.creaseCard, s.bowlerCard]}>
            <Text style={s.creaseLbl}>🎳 BOWLER</Text>
            {activeBowler ? (
              <>
                <Text style={s.creaseName}>{activeBowler.playerName}</Text>
                <Text style={s.creaseStats}>
                  {Math.floor(activeBowler.balls / 6)}.{activeBowler.balls % 6}ov · <Text style={{ color: Colors.red }}>W{activeBowler.wickets}</Text> · Eco {calcEconomy(activeBowler.runs, activeBowler.balls).toFixed(1)}
                </Text>
              </>
            ) : <Text style={s.creaseEmpty}>Not set</Text>}
          </View>
        </View>

        {/* Run Buttons */}
        <View style={s.runSection}>
          <View style={s.runSectionHeader}>
            <Text style={s.runLabel}>RUNS</Text>
            <TouchableOpacity
              onPress={handleUndo}
              style={[s.undoBtn, undoStack.length === 0 && { opacity: 0.4 }]}
              disabled={undoStack.length === 0}
            >
              <Ionicons name="arrow-undo" size={14} color={Colors.yellow} />
              <Text style={s.undoBtnText}>UNDO</Text>
            </TouchableOpacity>
          </View>
          <View style={s.runGrid}>
            {[0, 1, 2, 3, 4, 6].map((r) => (
              <RunBtn key={r} runs={r} onPress={() => handleBall(r)} disabled={isSubmitting} />
            ))}
            <RunBtn runs={-1} label="W" onPress={handleWicket} disabled={isSubmitting} variant="wicket" />
          </View>

          <Text style={[s.runLabel, { marginTop: 10 }]}>EXTRAS</Text>
          <View style={s.extrasGrid}>
            {[
              { label: 'Wide +1', onPress: () => handleBall(activeMatch.rules?.wideRuns ?? 1, 'wide') },
              { label: 'Wide +2', onPress: () => handleBall(2, 'wide') },
              { label: 'No Ball', onPress: () => handleBall(1, 'noball') },
              { label: 'Bye', onPress: () => handleBall(1, 'bye') },
              { label: 'Leg Bye', onPress: () => handleBall(1, 'legbye') },
              { label: 'Dead Ball', onPress: () => toast('Dead ball — no delivery') },
            ].map((e) => (
              <TouchableOpacity key={e.label} style={s.extraBtn} onPress={e.onPress} disabled={isSubmitting}>
                <Text style={s.extraBtnText}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Row */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowBowlerSheet(true)}>
            <Ionicons name="swap-horizontal" size={16} color={Colors.cyan} />
            <Text style={s.actionBtnText}>Bowler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={handleEndInnings}>
            <Ionicons name="flag" size={16} color={Colors.yellow} />
            <Text style={[s.actionBtnText, { color: Colors.yellow }]}>End Innings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.actionBtnRed]} onPress={handleEndMatch}>
            <Ionicons name="trophy" size={16} color={Colors.red} />
            <Text style={[s.actionBtnText, { color: Colors.red }]}>End Match</Text>
          </TouchableOpacity>
        </View>

        {/* Mini Scorecard */}
        <ScorecardMini batting={inn.batting} bowling={inn.bowling} />

        {/* Sheets */}
        <BottomSheet visible={showWicketSheet} onClose={() => setShowWicketSheet(false)} title="⚡ Wicket! Dismissal Type">
          <Text style={ss.sheetSubtitle}>How was {striker?.playerName ?? 'batsman'} dismissed?</Text>
          <View style={ss.dismissalGrid}>
            {DISMISSALS.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[ss.dismissalBtn, selectedDismissal === d.value && ss.dismissalBtnActive]}
                onPress={() => { setSelectedDismissal(d.value); confirmWicket(d.value); }}
              >
                <Text style={[ss.dismissalLabel, selectedDismissal === d.value && { color: Colors.cyan }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheet>

        <BottomSheet visible={showNextBatSheet} onClose={() => setShowNextBatSheet(false)} title="⚡ Next Batsman">
          <Text style={ss.sheetSubtitle}>Select incoming batsman</Text>
          {availablePlayers.map((p) => (
            <TouchableOpacity key={p.id} style={ss.playerRow} onPress={() => pendingWicketCallback?.(p.id, p.name)}>
              <View style={ss.playerBadge}><Text style={ss.playerJersey}>{p.jerseyNo ?? '#'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={ss.playerName}>{p.name}</Text>
                <Text style={ss.playerRole}>{p.role}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <Btn label="All Out — No more batsmen" variant="outline" onPress={() => pendingWicketCallback?.(null, null)} style={{ marginTop: 8 }} />
        </BottomSheet>

        <BowlerSheet
          visible={showBowlerSheet} onClose={() => setShowBowlerSheet(false)}
          innings={inn} bowlingTeamId={inn.bowlingTeamId}
          maxOvers={maxBowlerOvers} onSelect={handleBowlerChange}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── App Header ────────────────────────────────────────────────────────────────
function AppHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={headerS.bar}>
      <Text style={headerS.title}>{title}</Text>
      {sub && <Text style={headerS.sub}>{sub}</Text>}
    </View>
  );
}
const headerS = StyleSheet.create({
  bar: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.bg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.5 },
  sub: { fontSize: 10, color: Colors.muted, letterSpacing: 0.8, marginTop: 2 },
});

// ─── Powerplay Corner Lights ───────────────────────────────────────────────────
function PowerplayCorners() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const glow = anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,217,61,0)', 'rgba(255,217,61,0.6)'] });
  return (
    <View style={ppS.container} pointerEvents="none">
      <Animated.View style={[ppS.corner, ppS.tl, { backgroundColor: glow }]} />
      <Animated.View style={[ppS.corner, ppS.tr, { backgroundColor: glow }]} />
      <Animated.View style={[ppS.corner, ppS.bl, { backgroundColor: glow }]} />
      <Animated.View style={[ppS.corner, ppS.br, { backgroundColor: glow }]} />
    </View>
  );
}
const ppS = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, pointerEvents: 'none' },
  corner: { position: 'absolute', width: 80, height: 80, borderRadius: 40 },
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 60, left: 0 },
  br: { bottom: 60, right: 0 },
});

// ─── Run Button ───────────────────────────────────────────────────────────────
function RunBtn({ runs, label, onPress, disabled, variant }: any) {
  const colors: Record<string, any> = {
    '0': { bg: 'rgba(20,30,50,0.9)', border: 'rgba(255,255,255,0.08)', text: Colors.muted },
    '1': { bg: 'rgba(0,50,80,0.85)', border: 'rgba(0,212,255,0.35)', text: Colors.cyan },
    '2': { bg: 'rgba(0,50,80,0.85)', border: 'rgba(0,212,255,0.35)', text: Colors.cyan },
    '3': { bg: 'rgba(0,50,80,0.85)', border: 'rgba(0,212,255,0.35)', text: Colors.cyan },
    '4': { bg: 'rgba(0,120,60,0.9)', border: 'rgba(0,255,136,0.55)', text: Colors.green },
    '6': { bg: 'rgba(100,70,0,0.9)', border: 'rgba(255,217,61,0.65)', text: Colors.yellow },
    'wicket': { bg: 'rgba(120,0,0,0.9)', border: 'rgba(255,71,87,0.65)', text: Colors.red },
  };
  const c = colors[variant ?? String(runs)] ?? colors['1'];
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled} activeOpacity={0.72}
      style={[runS.btn, { backgroundColor: c.bg, borderColor: c.border, opacity: disabled ? 0.6 : 1 }]}
    >
      <Text style={[runS.label, { color: c.text }]}>{label ?? String(runs)}</Text>
    </TouchableOpacity>
  );
}
const runS = StyleSheet.create({
  btn: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  label: { fontSize: 22, fontWeight: '800' },
});

// ─── Bowler Sheet ─────────────────────────────────────────────────────────────
function BowlerSheet({ visible, onClose, innings, bowlingTeamId, maxOvers, onSelect }: any) {
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    if (!visible) return;
    getTeam(bowlingTeamId).then((t) => { if (t) setPlayers(t.players); });
  }, [visible, bowlingTeamId]);

  const prevBowler = innings.bowling
    .filter((b: BowlingRecord) => !b.isActive && b.balls > 0)
    .sort((a: BowlingRecord, b: BowlingRecord) => b.balls - a.balls)[0];

  const preferred = players.filter((p) => p.role === 'bowler' || p.role === 'allrounder');
  const others = players.filter((p) => p.role !== 'bowler' && p.role !== 'allrounder');

  const renderPlayer = (p: Player) => {
    const bRecord = innings.bowling.find((b: BowlingRecord) => b.playerId === p.id);
    const oversDone = bRecord ? Math.floor(bRecord.balls / 6) : 0;
    const isPrev = prevBowler?.playerId === p.id;
    const isMaxed = oversDone >= maxOvers;
    const disabled = isPrev || isMaxed;
    return (
      <TouchableOpacity key={p.id} style={[ss.playerRow, disabled && { opacity: 0.35 }]} onPress={() => !disabled && onSelect(p)} disabled={disabled}>
        <View style={[ss.playerBadge, { borderColor: 'rgba(255,217,61,0.3)' }]}>
          <Text style={[ss.playerJersey, { color: Colors.yellow }]}>{p.jerseyNo ?? '#'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ss.playerName}>
            {p.name}
            {isPrev && <Text style={{ color: Colors.yellow, fontSize: 10 }}> (prev)</Text>}
            {isMaxed && <Text style={{ color: Colors.red, fontSize: 10 }}> (maxed)</Text>}
          </Text>
          <Text style={ss.playerRole}>{oversDone}/{maxOvers} ov · {p.role}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="🎳 Select Bowler">
      {preferred.length > 0 && (<><Text style={ss.sectionLabel}>BOWLERS & ALL-ROUNDERS</Text>{preferred.map(renderPlayer)}</>)}
      {others.length > 0 && (<><Text style={[ss.sectionLabel, { marginTop: 12 }]}>OTHERS</Text>{others.map(renderPlayer)}</>)}
    </BottomSheet>
  );
}

// ─── Mini Scorecard ───────────────────────────────────────────────────────────
function ScorecardMini({ batting, bowling }: { batting: BattingRecord[]; bowling: BowlingRecord[] }) {
  return (
    <View style={sc.wrap}>
      <Text style={sc.sectionHead}>BATTING</Text>
      <View style={sc.tableHead}>
        {['Batsman', 'R', 'B', '4s', '6s', 'SR'].map((h) => <Text key={h} style={sc.th}>{h}</Text>)}
      </View>
      {batting.map((b) => (
        <View key={b.playerId} style={[sc.row, b.isStriker && sc.strikerRow]}>
          <Text style={[sc.td, { flex: 2 }]} numberOfLines={1}>
            {b.isStriker ? '⚡ ' : ''}{b.playerName}{b.isOut ? ` (${b.dismissal ?? 'out'})` : ''}
          </Text>
          <Text style={sc.td}>{b.runs}</Text>
          <Text style={sc.td}>{b.balls}</Text>
          <Text style={sc.td}>{b.fours}</Text>
          <Text style={sc.td}>{b.sixes}</Text>
          <Text style={sc.td}>{calcStrikeRate(b.runs, b.balls).toFixed(0)}</Text>
        </View>
      ))}

      <Text style={[sc.sectionHead, { marginTop: 12 }]}>BOWLING</Text>
      <View style={sc.tableHead}>
        {['Bowler', 'O', 'R', 'W', 'Eco'].map((h) => <Text key={h} style={sc.th}>{h}</Text>)}
      </View>
      {bowling.map((b) => (
        <View key={b.playerId} style={[sc.row, b.isActive && sc.strikerRow]}>
          <Text style={[sc.td, { flex: 2 }]} numberOfLines={1}>{b.isActive ? '🎳 ' : ''}{b.playerName}</Text>
          <Text style={sc.td}>{Math.floor(b.balls / 6)}.{b.balls % 6}</Text>
          <Text style={sc.td}>{b.runs}</Text>
          <Text style={[sc.td, { color: Colors.red }]}>{b.wickets}</Text>
          <Text style={sc.td}>{calcEconomy(b.runs, b.balls).toFixed(1)}</Text>
        </View>
      ))}
    </View>
  );
}

const ss = StyleSheet.create({
  sheetSubtitle: { fontSize: 13, color: Colors.muted, marginBottom: 14 },
  dismissalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dismissalBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: 'rgba(0,180,255,0.04)', minWidth: '45%', alignItems: 'center',
  },
  dismissalBtnActive: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.12)' },
  dismissalLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 6,
    backgroundColor: 'rgba(0,180,255,0.06)', borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
  },
  playerBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,212,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  playerJersey: { fontSize: 13, fontWeight: '700', color: Colors.cyan },
  playerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  playerRole: { fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  sectionLabel: { fontSize: 9, fontWeight: '700', color: Colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
});

const sc = StyleSheet.create({
  wrap: { margin: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden' },
  sectionHead: { fontSize: 9, fontWeight: '700', color: Colors.cyan, letterSpacing: 1.4, textTransform: 'uppercase', padding: 10, backgroundColor: 'rgba(0,180,255,0.04)', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableHead: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(0,180,255,0.08)' },
  th: { flex: 1, fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(0,180,255,0.06)' },
  strikerRow: { backgroundColor: 'rgba(255,217,61,0.04)' },
  td: { flex: 1, fontSize: 12, color: Colors.text },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  targetBanner: {
    backgroundColor: 'rgba(255,71,87,0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,71,87,0.2)',
    paddingVertical: 8, paddingHorizontal: 16,
  },
  targetText: { fontSize: 12, color: 'rgba(232,244,255,0.8)', textAlign: 'center' },
  scoreBox: { alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  scoreBoxPP: { backgroundColor: 'rgba(255,217,61,0.04)' },
  ppLabel: { marginBottom: 4 },
  ppLabelText: { fontSize: 11, fontWeight: '800', color: Colors.yellow, letterSpacing: 2 },
  scoreMain: { fontSize: 56, fontWeight: '800', color: Colors.cyan, lineHeight: 62 },
  scoreOvers: { fontSize: 12, color: Colors.muted, letterSpacing: 0.6, marginTop: 2 },
  wktsBar: { flexDirection: 'row', gap: 5, marginTop: 10 },
  wktDot: { width: 10, height: 10, borderRadius: 5 },
  overStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(0,180,255,0.03)', borderBottomWidth: 1, borderBottomColor: Colors.border, flexWrap: 'wrap',
  },
  overLabel: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  ballDot: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(20,30,50,0.9)',
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  ballDotText: { fontSize: 16, color: Colors.muted, fontWeight: '700' },
  bowlerAlert: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,217,61,0.15)', borderWidth: 1, borderColor: Colors.yellow,
  },
  bowlerAlertText: { fontSize: 11, fontWeight: '800', color: Colors.yellow, letterSpacing: 1 },
  creaseRow: { flexDirection: 'row', gap: 6, padding: 10 },
  creaseCard: {
    flex: 1, backgroundColor: 'rgba(0,180,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,180,255,0.1)',
    borderRadius: Radius.md, padding: 9, borderLeftWidth: 3, borderLeftColor: 'rgba(0,180,255,0.15)',
  },
  strikerCard: { borderLeftColor: Colors.yellow, backgroundColor: 'rgba(255,217,61,0.04)' },
  bowlerCard: { borderLeftColor: Colors.red, backgroundColor: 'rgba(255,71,87,0.04)' },
  creaseLbl: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  creaseName: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  creaseStats: { fontSize: 10, color: Colors.muted },
  creaseEmpty: { fontSize: 11, color: Colors.muted, fontStyle: 'italic' },
  runSection: { padding: 12 },
  runSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  runLabel: { fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,217,61,0.3)', backgroundColor: 'rgba(255,217,61,0.08)',
  },
  undoBtnText: { fontSize: 10, fontWeight: '800', color: Colors.yellow, letterSpacing: 0.8 },
  runGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8, justifyContent: 'center' },
  extrasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  extraBtn: {
    flex: 1, minWidth: '30%', paddingVertical: 9, paddingHorizontal: 4,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: 'rgba(0,180,255,0.04)', alignItems: 'center',
  },
  extraBtnText: { fontSize: 11, fontWeight: '600', color: Colors.text },
  actionRow: {
    flexDirection: 'row', gap: 8, padding: 10,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.15)',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.05)',
  },
  actionBtnRed: { borderColor: 'rgba(255,71,87,0.3)', backgroundColor: 'rgba(255,71,87,0.06)' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: Colors.cyan },
});
