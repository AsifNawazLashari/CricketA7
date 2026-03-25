import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, SafeAreaView, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useMatch } from '../../context/MatchContext';
import { useToast } from '../../context/ToastContext';
import {
  createMatch, createTournament, getTournaments,
  recordToss, startInnings, getTeam, defaultTapeballRules, defaultLeatherRules,
} from '../../services/firebase';
import { BottomSheet } from '../../components/BottomSheet';
import { Btn, Badge, FormField, SectionTitle, SegmentControl, EmptyState, Loader } from '../../components/UI';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { Tournament, Team, Player, MatchRules, Match, MatchType } from '../../types';

export default function ManageScreen() {
  const { user, hasRole, isOrganizer, generateToken } = useAuth();
  const { allMatches, activeMatch, activeMatchId, setActiveMatch } = useMatch();
  const { toast } = useToast();
  const [tab, setTab] = useState<'active' | 'quick' | 'tournament'>('active');

  if (!hasRole('developer', 'organizer', 'captain')) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={hdr.bar}>
          <Text style={hdr.title}>MATCH MANAGER</Text>
        </View>
        <EmptyState icon="🔒" title="Access Restricted" desc="Sign in from the Home screen to manage matches." />
      </SafeAreaView>
    );
  }

  const tabs = isOrganizer()
    ? [{ label: 'Active', value: 'active' }, { label: 'Quick Match', value: 'quick' }, { label: 'Tournament', value: 'tournament' }]
    : [{ label: 'Active', value: 'active' }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={hdr.bar}>
        <View>
          <Text style={hdr.title}>MATCH MANAGER</Text>
          {user && <Text style={hdr.sub}>{user.displayName} · {user.role.toUpperCase()}</Text>}
        </View>
        {isOrganizer() && (
          <TouchableOpacity
            style={hdr.tokenBtn}
            onPress={() => {
              const token = generateToken('captain');
              Alert.alert('Captain Invite Token', `Share this token with a captain:\n\n${token}\n\nThey can join from the Sign In screen.`, [
                { text: 'Share', onPress: () => Share.share({ message: `Join Cricket A7 as Captain! Token: ${token}` }) },
                { text: 'OK' },
              ]);
            }}
          >
            <Ionicons name="link" size={14} color={Colors.yellow} />
            <Text style={hdr.tokenBtnText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>
      <SegmentControl options={tabs} value={tab} onChange={(v) => setTab(v as any)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {tab === 'active' && <ActiveMatchPanel />}
        {tab === 'quick' && isOrganizer() && <QuickMatchSetup />}
        {tab === 'tournament' && isOrganizer() && <TournamentPanel />}
      </ScrollView>
    </SafeAreaView>
  );
}

const hdr = StyleSheet.create({
  bar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.5 },
  sub: { fontSize: 10, color: Colors.muted, marginTop: 2, letterSpacing: 0.6 },
  tokenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,217,61,0.4)',
    backgroundColor: 'rgba(255,217,61,0.08)',
  },
  tokenBtnText: { fontSize: 12, fontWeight: '700', color: Colors.yellow },
});

// ─── Active Match Panel ───────────────────────────────────────────────────────

function ActiveMatchPanel() {
  const { allMatches, activeMatch, activeMatchId, setActiveMatch, setCurrentInningsIdx } = useMatch();
  const { isOrganizer } = useAuth();
  const { toast } = useToast();
  const [showTossSheet, setShowTossSheet] = useState(false);
  const [showInningsSheet, setShowInningsSheet] = useState(false);
  const [teams, setTeams] = useState<{ t1: Team | null; t2: Team | null }>({ t1: null, t2: null });

  const liveAndScheduled = allMatches.filter((m) => m.status !== 'completed' && m.status !== 'abandoned');

  useEffect(() => {
    if (!activeMatch) return;
    Promise.all([getTeam(activeMatch.team1Id), getTeam(activeMatch.team2Id)]).then(([t1, t2]) => setTeams({ t1, t2 }));
  }, [activeMatch?.id]);

  if (liveAndScheduled.length === 0) {
    return <EmptyState icon="🏏" title="No Active Matches" desc={isOrganizer() ? "Create a Quick Match or Tournament match." : "Ask your organizer to create a match."} />;
  }

  return (
    <View>
      <SectionTitle title="📋 Matches" />
      {liveAndScheduled.map((m) => (
        <TouchableOpacity
          key={m.id}
          style={[ap.matchCard, activeMatchId === m.id && ap.activeCard]}
          onPress={() => setActiveMatch(m.id)}
          activeOpacity={0.82}
        >
          <View style={ap.mcTop}>
            <View style={{ flex: 1 }}>
              <Text style={ap.mcTitle}>{m.team1Name} vs {m.team2Name}</Text>
              <Text style={ap.mcMeta}>{m.overs}ov · {m.matchType} {m.venue ? `· ${m.venue}` : ''}</Text>
            </View>
            <Badge
              label={m.status.toUpperCase().replace('_', ' ')}
              color={m.status === 'live' ? 'red' : m.status === 'completed' ? 'green' : 'grey'}
              dot={m.status === 'live'}
            />
          </View>
          {activeMatchId === m.id && (
            <View style={ap.activeIndicator}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.cyan} />
              <Text style={ap.activeText}>Currently Managing</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {activeMatch && isOrganizer() && (
        <View style={ap.controlPanel}>
          <View style={ap.controlHeader}>
            <Ionicons name="settings" size={14} color={Colors.cyan} />
            <Text style={ap.controlHeaderText}>MATCH CONTROLS</Text>
          </View>

          <View style={ap.controlGrid}>
            {activeMatch.status === 'scheduled' && (
              <TouchableOpacity style={ap.controlBtn} onPress={() => setShowTossSheet(true)}>
                <Text style={ap.controlBtnIcon}>🎲</Text>
                <Text style={ap.controlBtnText}>Do Toss</Text>
              </TouchableOpacity>
            )}
            {(activeMatch.status === 'toss' || activeMatch.status === 'scheduled') && (
              <TouchableOpacity style={ap.controlBtn} onPress={() => { setCurrentInningsIdx(0); setShowInningsSheet(true); }}>
                <Text style={ap.controlBtnIcon}>🏏</Text>
                <Text style={ap.controlBtnText}>Start Innings 1</Text>
              </TouchableOpacity>
            )}
            {activeMatch.status === 'innings_break' && (
              <TouchableOpacity style={[ap.controlBtn, { borderColor: Colors.green + '40' }]} onPress={() => { setCurrentInningsIdx(1); setShowInningsSheet(true); }}>
                <Text style={ap.controlBtnIcon}>🏏</Text>
                <Text style={[ap.controlBtnText, { color: Colors.green }]}>Start Innings 2</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeMatch.tossWinnerId && (
            <View style={ap.tossBar}>
              <Text style={ap.tossText}>
                🎲 {activeMatch.tossWinnerId === activeMatch.team1Id ? activeMatch.team1Name : activeMatch.team2Name} won toss — elected to {activeMatch.tossDecision === 'bat' ? 'BAT' : 'BOWL'} first
              </Text>
            </View>
          )}

          {activeMatch.innings.map((inn) => (
            <View key={inn.id} style={ap.inningsRow}>
              <View style={ap.inningsBadgeBox}>
                <Text style={ap.inningsBadgeText}>INN {inn.inningsNo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ap.innTeam}>{inn.battingTeamId === activeMatch.team1Id ? activeMatch.team1Name : activeMatch.team2Name}</Text>
                <Text style={ap.innScore}>{inn.runs}/{inn.wickets} · {Math.floor(inn.balls / 6)}.{inn.balls % 6} ov</Text>
              </View>
              {inn.isComplete && <Badge label="DONE" color="green" />}
            </View>
          ))}
        </View>
      )}

      {activeMatch && isOrganizer() && (
        <>
          <TossSheet visible={showTossSheet} onClose={() => setShowTossSheet(false)} match={activeMatch}
            onComplete={(_, d) => { setShowTossSheet(false); toast(`Toss done! ${d === 'bat' ? 'Batting' : 'Bowling'} first.`); }} />
          {teams.t1 && teams.t2 && (
            <InningsSetupSheet visible={showInningsSheet} onClose={() => setShowInningsSheet(false)}
              match={activeMatch} inningsNo={activeMatch.status === 'innings_break' ? 2 : 1}
              t1={teams.t1} t2={teams.t2}
              onComplete={() => { setShowInningsSheet(false); toast('Innings started! 🏏'); }} />
          )}
        </>
      )}
    </View>
  );
}

// ─── Toss Sheet ───────────────────────────────────────────────────────────────

function TossSheet({ visible, onClose, match, onComplete }: any) {
  const { toast } = useToast();
  const [winnerId, setWinnerId] = useState('');
  const [decision, setDecision] = useState<'bat' | 'bowl'>('bat');

  const submit = async () => {
    if (!winnerId) { toast('Select toss winner'); return; }
    await recordToss(match.id, winnerId, decision);
    onComplete(winnerId, decision);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="🎲 Toss Result">
      <Text style={sh.label}>Who won the toss?</Text>
      <View style={sh.row}>
        {[{ id: match.team1Id, name: match.team1Name }, { id: match.team2Id, name: match.team2Name }].map((t) => (
          <TouchableOpacity key={t.id} style={[sh.optBtn, winnerId === t.id && sh.optActive]} onPress={() => setWinnerId(t.id)}>
            <Text style={[sh.optText, winnerId === t.id && { color: Colors.cyan }]}>{t.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[sh.label, { marginTop: 16 }]}>Elected to:</Text>
      <View style={sh.row}>
        {(['bat', 'bowl'] as const).map((d) => (
          <TouchableOpacity key={d} style={[sh.optBtn, decision === d && sh.optActive]} onPress={() => setDecision(d)}>
            <Text style={[sh.optText, decision === d && { color: Colors.cyan }]}>{d === 'bat' ? '🏏 Bat First' : '🎳 Bowl First'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Btn label="Record Toss" variant="gold" onPress={submit} style={{ marginTop: 20 }} fullWidth />
    </BottomSheet>
  );
}

// ─── Innings Setup Sheet ──────────────────────────────────────────────────────

function InningsSetupSheet({ visible, onClose, match, inningsNo, t1, t2, onComplete }: any) {
  const { toast } = useToast();
  const [strikerId, setStrikerId] = useState('');
  const [strikerName, setStrikerName] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [nonStrikerName, setNonStrikerName] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [bowlerName, setBowlerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  let battingTeam: Team, bowlingTeam: Team;
  if (inningsNo === 1) {
    const tossWon = match.tossWinnerId === match.team1Id;
    const batsFirst = match.tossDecision === 'bat';
    battingTeam = (tossWon === batsFirst) ? t1 : t2;
    bowlingTeam = (tossWon === batsFirst) ? t2 : t1;
  } else {
    const firstBatTeamId = match.innings[0]?.battingTeamId;
    battingTeam = firstBatTeamId === t1.id ? t2 : t1;
    bowlingTeam = firstBatTeamId === t1.id ? t1 : t2;
  }

  const submit = async () => {
    if (!strikerId || !nonStrikerId || !bowlerId) { toast('Select striker, non-striker & opening bowler'); return; }
    if (strikerId === nonStrikerId) { toast('Striker and non-striker must be different players'); return; }
    setIsSubmitting(true);
    try {
      await startInnings(match.id, inningsNo, battingTeam.id, bowlingTeam.id, strikerId, strikerName, nonStrikerId, nonStrikerName, bowlerId, bowlerName, match.rules);
      onComplete();
    } catch { toast('Error starting innings'); }
    setIsSubmitting(false);
  };

  const PlayerPicker = ({ label, selected, onSelect, players, excludeId }: any) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={sh.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {(players as Player[]).map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[sh.playerChip, selected === p.id && sh.playerChipActive, excludeId === p.id && { opacity: 0.3 }]}
            onPress={() => excludeId !== p.id && onSelect(p.id, p.name)}
            disabled={excludeId === p.id}
          >
            {p.jerseyNo && <Text style={sh.chipJersey}>#{p.jerseyNo}</Text>}
            <Text style={[sh.chipName, selected === p.id && { color: Colors.cyan }]} numberOfLines={1}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`🏏 Setup Innings ${inningsNo}`}>
      <View style={sh.infoRow}>
        <Text style={sh.infoItem}>Bat: <Text style={{ color: Colors.cyan, fontWeight: '700' }}>{battingTeam.name}</Text></Text>
        <Text style={sh.infoItem}>Bowl: <Text style={{ color: Colors.yellow, fontWeight: '700' }}>{bowlingTeam.name}</Text></Text>
      </View>
      <PlayerPicker label="Opening Striker" selected={strikerId} onSelect={(id: string, n: string) => { setStrikerId(id); setStrikerName(n); }} players={battingTeam.players} excludeId={nonStrikerId} />
      <PlayerPicker label="Non-Striker" selected={nonStrikerId} onSelect={(id: string, n: string) => { setNonStrikerId(id); setNonStrikerName(n); }} players={battingTeam.players} excludeId={strikerId} />
      <PlayerPicker label="Opening Bowler" selected={bowlerId} onSelect={(id: string, n: string) => { setBowlerId(id); setBowlerName(n); }} players={bowlingTeam.players} />
      <Btn label={`Start Innings ${inningsNo}`} variant="primary" onPress={submit} loading={isSubmitting} style={{ marginTop: 16 }} fullWidth />
    </BottomSheet>
  );
}

// ─── Shared sheet styles ──────────────────────────────────────────────────────

const sh = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '700', color: Colors.cyan, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  optBtn: { flex: 1, padding: 13, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)', alignItems: 'center' },
  optActive: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.12)' },
  optText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  playerChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)', alignItems: 'center' },
  playerChipActive: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.12)' },
  chipJersey: { fontSize: 8, color: Colors.muted },
  chipName: { fontSize: 12, fontWeight: '600', color: Colors.text },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, padding: 10, backgroundColor: 'rgba(0,180,255,0.06)', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  infoItem: { fontSize: 12, color: Colors.muted },
});

// ─── Quick Match Setup ────────────────────────────────────────────────────────

function QuickMatchSetup() {
  const { toast } = useToast();
  const { setActiveMatch } = useMatch();
  const [matchType, setMatchType] = useState<MatchType>('tapeball');
  const [form, setForm] = useState({ team1Name: '', team1Code: '', team2Name: '', team2Code: '', overs: '10', venue: '', format: 'T10' });
  const [rules, setRules] = useState<MatchRules>(defaultTapeballRules(10));
  const [powerplay, setPowerplay] = useState(false);
  const [powerplayOvers, setPowerplayOvers] = useState('2');
  const [isCreating, setIsCreating] = useState(false);

  const handleMatchTypeChange = (mt: MatchType) => {
    setMatchType(mt);
    const overs = parseInt(form.overs) || 10;
    setRules(mt === 'tapeball' ? defaultTapeballRules(overs) : defaultLeatherRules(overs));
    setForm((p) => ({ ...p, format: mt === 'tapeball' ? 'T10' : 'T20', overs: mt === 'tapeball' ? '10' : '20' }));
  };

  const create = async () => {
    if (!form.team1Name.trim() || !form.team2Name.trim()) { toast('Enter both team names'); return; }
    if (!form.team1Name || !form.team2Name) return;
    setIsCreating(true);
    try {
      const oversNum = parseInt(form.overs) || 10;
      const mergedRules: MatchRules = {
        ...(matchType === 'tapeball' ? defaultTapeballRules(oversNum) : defaultLeatherRules(oversNum)),
        ...rules,
        maxBowlerOvers: Math.ceil(oversNum / 5),
      };
      const t = await createTournament({ name: 'Quick Play', format: 'knockout', overs: oversNum, matchType, venue: form.venue || undefined });
      const { createTeam: ct } = await import('../../services/firebase');
      const t1 = await ct({ name: form.team1Name.trim(), code: form.team1Code.trim() || form.team1Name.slice(0, 3).toUpperCase(), color: '#00d4ff', tournamentId: t.id, matchType });
      const t2 = await ct({ name: form.team2Name.trim(), code: form.team2Code.trim() || form.team2Name.slice(0, 3).toUpperCase(), color: '#ffd93d', tournamentId: t.id, matchType });
      const m = await createMatch({
        tournamentId: t.id, tournamentName: t.name,
        team1Id: t1.id, team1Name: t1.name, team1Code: t1.code,
        team2Id: t2.id, team2Name: t2.name, team2Code: t2.code,
        stage: 'standalone', roundNo: 1, overs: oversNum,
        matchType, matchFormat: form.format as any,
        venue: form.venue || undefined, rules: mergedRules,
        powerplayEnabled: powerplay,
        powerplayOvers: powerplay ? parseInt(powerplayOvers) || 2 : undefined,
      });
      setActiveMatch(m.id);
      toast('Quick match created! 🏏', 'success');
    } catch { toast('Error creating match'); }
    setIsCreating(false);
  };

  const formats = matchType === 'tapeball' ? ['T6', 'T8', 'T10'] : ['T20', 'ODI', 'custom'];

  return (
    <View style={qm.wrap}>
      <SectionTitle title="⚡ Quick Play Setup" />

      {/* Match Type */}
      <View style={qm.card}>
        <Text style={qm.cardTitle}>MATCH TYPE</Text>
        <View style={qm.btnRow}>
          {(['tapeball', 'leather'] as MatchType[]).map((mt) => (
            <TouchableOpacity key={mt} style={[qm.optBtn, matchType === mt && qm.optActive]} onPress={() => handleMatchTypeChange(mt)}>
              <Text style={[qm.optText, matchType === mt && { color: Colors.cyan }]}>{mt === 'tapeball' ? '🎾 Tapeball' : '🏏 Leather Ball'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Format */}
      <View style={qm.card}>
        <Text style={qm.cardTitle}>FORMAT</Text>
        <View style={qm.btnRow}>
          {formats.map((f) => (
            <TouchableOpacity key={f} style={[qm.optBtn, form.format === f && qm.optActive]}
              onPress={() => setForm((p) => ({ ...p, format: f, overs: f === 'T6' ? '6' : f === 'T8' ? '8' : f === 'T10' ? '10' : f === 'T20' ? '20' : f === 'ODI' ? '50' : p.overs }))}>
              <Text style={[qm.optText, form.format === f && { color: Colors.cyan }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {form.format === 'custom' && (
          <FormField label="Custom Overs" value={form.overs} onChangeText={(v) => setForm((p) => ({ ...p, overs: v }))} keyboardType="number-pad" style={{ marginTop: 10 }} />
        )}
      </View>

      {/* Teams */}
      <View style={qm.card}>
        <Text style={qm.cardTitle}>TEAMS</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <FormField label="Team 1 Name" value={form.team1Name} onChangeText={(v) => setForm((p) => ({ ...p, team1Name: v }))} placeholder="Karachi Kings" style={{ flex: 2 }} />
          <FormField label="Code" value={form.team1Code} onChangeText={(v) => setForm((p) => ({ ...p, team1Code: v.toUpperCase().slice(0, 4) }))} placeholder="KAR" style={{ flex: 1 }} maxLength={4} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <FormField label="Team 2 Name" value={form.team2Name} onChangeText={(v) => setForm((p) => ({ ...p, team2Name: v }))} placeholder="Lahore Lions" style={{ flex: 2 }} />
          <FormField label="Code" value={form.team2Code} onChangeText={(v) => setForm((p) => ({ ...p, team2Code: v.toUpperCase().slice(0, 4) }))} placeholder="LAH" style={{ flex: 1 }} maxLength={4} />
        </View>
        <FormField label="Venue (optional)" value={form.venue} onChangeText={(v) => setForm((p) => ({ ...p, venue: v }))} placeholder="e.g. Karachi, DHA Ground" />
      </View>

      {/* Powerplay */}
      <View style={qm.card}>
        <Text style={qm.cardTitle}>POWERPLAY</Text>
        <View style={qm.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={qm.toggleLabel}>Enable Powerplay</Text>
            <Text style={qm.toggleDesc}>Flashing corner lights & field restriction indicators</Text>
          </View>
          <Switch
            value={powerplay}
            onValueChange={setPowerplay}
            trackColor={{ false: 'rgba(107,138,170,0.2)', true: 'rgba(255,217,61,0.4)' }}
            thumbColor={powerplay ? Colors.yellow : Colors.muted}
          />
        </View>
        {powerplay && (
          <FormField label="Powerplay Overs (e.g. 2)" value={powerplayOvers} onChangeText={setPowerplayOvers} keyboardType="number-pad" style={{ marginTop: 10 }} />
        )}
      </View>

      {/* Rules */}
      <View style={qm.card}>
        <Text style={qm.cardTitle}>RULES</Text>
        <RuleToggle label="No-ball gives Free Hit" value={rules.noBallFreeHit} onChange={(v) => setRules((p) => ({ ...p, noBallFreeHit: v }))} />
        {matchType === 'tapeball' && <RuleToggle label="Leg byes allowed" value={rules.legByeAllowed} onChange={(v) => setRules((p) => ({ ...p, legByeAllowed: v }))} />}
        {matchType === 'leather' && <RuleToggle label="DRS Enabled" value={rules.drsEnabled} onChange={(v) => setRules((p) => ({ ...p, drsEnabled: v }))} />}
        <RuleToggle label="Wide = +2 runs" value={rules.wideRuns === 2} onChange={(v) => setRules((p) => ({ ...p, wideRuns: v ? 2 : 1 }))} />
      </View>

      <TouchableOpacity style={qm.createBtn} onPress={create} disabled={isCreating}>
        {isCreating
          ? <Text style={qm.createBtnText}>Creating...</Text>
          : <><Text style={qm.createBtnIcon}>🏏</Text><Text style={qm.createBtnText}>Create Match</Text></>}
      </TouchableOpacity>
    </View>
  );
}

function RuleToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={rt.row}>
      <Text style={rt.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: 'rgba(107,138,170,0.2)', true: 'rgba(0,212,255,0.4)' }}
        thumbColor={value ? Colors.cyan : Colors.muted}
      />
    </View>
  );
}
const rt = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(0,180,255,0.06)' },
  label: { fontSize: 13, color: Colors.text, flex: 1 },
});

// ─── Tournament Panel ─────────────────────────────────────────────────────────

function TournamentPanel() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => { setTournaments(await getTournaments()); setIsLoading(false); };
  useEffect(() => { load(); }, []);

  if (isLoading) return <Loader text="Loading tournaments..." />;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 }}>
        <SectionTitle title="🏆 Tournaments" />
        <TouchableOpacity style={tp.addBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={14} color={Colors.cyan} />
          <Text style={tp.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {tournaments.length === 0
        ? <EmptyState icon="🏆" title="No Tournaments" desc="Create your first tournament to get started." />
        : tournaments.map((t) => (
            <View key={t.id} style={tp.card}>
              <View style={tp.cardTop}>
                <Text style={tp.cardName}>{t.name}</Text>
                <Badge label={t.format.toUpperCase()} color="cyan" />
              </View>
              <Text style={tp.cardMeta}>{t.overs} overs{t.venue ? ` · ${t.venue}` : ''}</Text>
            </View>
          ))
      }

      <CreateTournamentSheet visible={showCreate} onClose={() => setShowCreate(false)}
        onComplete={() => { setShowCreate(false); load(); toast('Tournament created!', 'success'); }} />
    </View>
  );
}

function CreateTournamentSheet({ visible, onClose, onComplete }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', format: 'knockout', overs: '10', venue: '' });
  const [isCreating, setIsCreating] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) { toast('Enter tournament name'); return; }
    setIsCreating(true);
    try {
      await createTournament({ name: form.name.trim(), format: form.format as any, overs: parseInt(form.overs) || 10, venue: form.venue || undefined });
      onComplete();
      setForm({ name: '', format: 'knockout', overs: '10', venue: '' });
    } catch { toast('Error creating tournament'); }
    setIsCreating(false);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="🏆 New Tournament">
      <FormField label="Tournament Name" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Ashes Cup 2026" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <FormField label="Overs" value={form.overs} onChangeText={(v) => setForm((p) => ({ ...p, overs: v }))} keyboardType="number-pad" style={{ flex: 1 }} />
        <FormField label="Venue (optional)" value={form.venue} onChangeText={(v) => setForm((p) => ({ ...p, venue: v }))} placeholder="Stadium / City" style={{ flex: 2 }} />
      </View>
      <Text style={{ fontSize: 10, color: Colors.cyan, letterSpacing: 1.2, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>Format</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
        {['knockout', 'league', 'hybrid'].map((f) => (
          <TouchableOpacity key={f} style={[sh.optBtn, form.format === f && sh.optActive]} onPress={() => setForm((p) => ({ ...p, format: f }))}>
            <Text style={[sh.optText, form.format === f && { color: Colors.cyan }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Btn label="Create Tournament" variant="gold" onPress={submit} loading={isCreating} fullWidth />
    </BottomSheet>
  );
}

const qm = StyleSheet.create({
  wrap: { padding: 12 },
  card: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 9, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 8 },
  optBtn: { flex: 1, padding: 11, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)', alignItems: 'center' },
  optActive: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.12)' },
  optText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  toggleDesc: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.cyan, borderRadius: Radius.md, paddingVertical: 16, marginTop: 4,
  },
  createBtnIcon: { fontSize: 18 },
  createBtnText: { fontSize: 15, fontWeight: '800', color: Colors.bg, letterSpacing: 0.5 },
});

const tp = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.06)' },
  addBtnText: { fontSize: 12, fontWeight: '700', color: Colors.cyan },
  card: { marginHorizontal: 12, marginBottom: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)' },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.cyan },
  cardMeta: { fontSize: 11, color: Colors.muted, padding: 10 },
});

const ap = StyleSheet.create({
  matchCard: { marginHorizontal: 12, marginBottom: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 14 },
  activeCard: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.04)' },
  mcTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mcTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  mcMeta: { fontSize: 11, color: Colors.muted },
  activeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  activeText: { fontSize: 11, color: Colors.cyan, fontWeight: '600' },
  controlPanel: { marginHorizontal: 12, marginBottom: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden' },
  controlHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)' },
  controlHeaderText: { fontSize: 10, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.4, textTransform: 'uppercase' },
  controlGrid: { flexDirection: 'row', gap: 8, padding: 12, flexWrap: 'wrap' },
  controlBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.06)' },
  controlBtnIcon: { fontSize: 16 },
  controlBtnText: { fontSize: 13, fontWeight: '700', color: Colors.cyan },
  tossBar: { margin: 12, marginTop: 0, backgroundColor: 'rgba(255,217,61,0.08)', borderWidth: 1, borderColor: 'rgba(255,217,61,0.25)', borderRadius: Radius.md, padding: 10 },
  tossText: { fontSize: 12, color: Colors.yellow, textAlign: 'center' },
  inningsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  inningsBadgeBox: { backgroundColor: 'rgba(0,180,255,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  inningsBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.cyan, letterSpacing: 1 },
  innTeam: { fontSize: 12, color: Colors.text, fontWeight: '600' },
  innScore: { fontSize: 11, color: Colors.cyan, marginTop: 1 },
});

