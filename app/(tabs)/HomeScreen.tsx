import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Animated, SafeAreaView, Modal, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMatch } from '../../context/MatchContext';
import { useAuth } from '../../context/AuthContext';
import { Badge, SectionTitle, EmptyState, Loader } from '../../components/UI';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';
import { Match } from '../../types';
import { calcCRR, calcRRR } from '../../services/firebase';

export default function HomeScreen({ navigation }: any) {
  const { allMatches, isLoadingMatches, setActiveMatch } = useMatch();
  const { user, signIn, signOut, validateToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInMode, setSignInMode] = useState<'select' | 'token'>('select');
  const [nameInput, setNameInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const liveMatches = allMatches.filter((m) => m.status === 'live');
  const upcomingMatches = allMatches.filter((m) => m.status === 'scheduled' || m.status === 'toss');
  const completedMatches = allMatches.filter((m) => m.status === 'completed').slice(0, 5);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSignInAsOrganizer = () => {
    if (!nameInput.trim()) { Alert.alert('Enter your name'); return; }
    signIn(nameInput.trim(), 'organizer');
    setShowSignIn(false);
    setNameInput('');
  };

  const handleJoinWithToken = () => {
    const invite = validateToken(tokenInput.trim());
    if (!invite) { Alert.alert('Invalid Token', 'This token is not valid or has expired.'); return; }
    if (!nameInput.trim()) { Alert.alert('Enter your name'); return; }
    signIn(nameInput.trim(), invite.role, invite.teamId);
    setShowSignIn(false);
    setNameInput('');
    setTokenInput('');
  };

  const roleColor = user?.role === 'organizer' ? Colors.yellow : user?.role === 'captain' ? Colors.green : Colors.cyan;

  if (isLoadingMatches) return <Loader text="Loading matches..." />;

  return (
    <SafeAreaView style={styles.safe}>
      {/* App Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🏏</Text>
          <View>
            <Text style={styles.headerTitle}>CRICKET A7</Text>
            <Text style={styles.headerSub}>LIVE SCORE CENTER</Text>
          </View>
        </View>
        {user ? (
          <TouchableOpacity onPress={() => Alert.alert(
            `${user.displayName}`,
            `Role: ${user.role.toUpperCase()}`,
            [
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
              { text: 'Cancel', style: 'cancel' },
            ]
          )} style={[styles.userPill, { borderColor: roleColor + '60' }]}>
            <View style={[styles.userDot, { backgroundColor: roleColor }]} />
            <Text style={[styles.userPillText, { color: roleColor }]}>{user.displayName}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setShowSignIn(true)} style={styles.signInBtn}>
            <Ionicons name="person-outline" size={14} color={Colors.cyan} />
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cyan} />
        }
      >
        {/* Live Banner */}
        {liveMatches.length > 0 && (
          <View style={styles.liveBanner}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveBannerText}>{liveMatches.length} MATCH{liveMatches.length > 1 ? 'ES' : ''} LIVE NOW</Text>
          </View>
        )}

        {/* Live Matches */}
        <SectionTitle
          title="⚡ Match Center"
          right={liveMatches.length > 0 && (
            <Badge label={`${liveMatches.length} LIVE`} color="red" dot />
          )}
        />
        {liveMatches.length === 0 ? (
          <View style={styles.noLiveCard}>
            <Text style={styles.noLiveIcon}>🏏</Text>
            <Text style={styles.noLiveText}>No live matches right now</Text>
            <Text style={styles.noLiveSub}>Pull to refresh</Text>
          </View>
        ) : (
          liveMatches.map((m) => (
            <LiveMatchCard
              key={m.id}
              match={m}
              onPress={() => {
                setActiveMatch(m.id);
                navigation?.navigate?.('Score');
              }}
            />
          ))
        )}

        {/* Upcoming */}
        {upcomingMatches.length > 0 && (
          <>
            <SectionTitle title="📅 Upcoming" />
            {upcomingMatches.slice(0, 3).map((m) => (
              <MatchCard key={m.id} match={m} status="upcoming" />
            ))}
          </>
        )}

        {/* Results */}
        {completedMatches.length > 0 && (
          <>
            <SectionTitle title="✅ Results" />
            {completedMatches.map((m) => (
              <MatchCard key={m.id} match={m} status="completed" />
            ))}
          </>
        )}
      </ScrollView>

      {/* Sign In Modal */}
      <Modal visible={showSignIn} transparent animationType="slide" onRequestClose={() => setShowSignIn(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sign In to Cricket A7</Text>

            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeBtn, signInMode === 'select' && styles.modeBtnActive]}
                onPress={() => setSignInMode('select')}
              >
                <Text style={[styles.modeBtnText, signInMode === 'select' && { color: Colors.cyan }]}>Organizer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, signInMode === 'token' && styles.modeBtnActive]}
                onPress={() => setSignInMode('token')}
              >
                <Text style={[styles.modeBtnText, signInMode === 'token' && { color: Colors.cyan }]}>Join with Token</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>YOUR NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name..."
              placeholderTextColor={Colors.muted}
              value={nameInput}
              onChangeText={setNameInput}
              autoCapitalize="words"
            />

            {signInMode === 'token' && (
              <>
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>INVITE TOKEN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter invite token..."
                  placeholderTextColor={Colors.muted}
                  value={tokenInput}
                  onChangeText={(t) => setTokenInput(t.toUpperCase())}
                  autoCapitalize="characters"
                />
              </>
            )}

            <TouchableOpacity
              style={styles.modalSignInBtn}
              onPress={signInMode === 'select' ? handleSignInAsOrganizer : handleJoinWithToken}
            >
              <Text style={styles.modalSignInBtnText}>
                {signInMode === 'select' ? 'Sign In as Organizer' : 'Join with Token'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSignIn(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── LiveMatchCard ────────────────────────────────────────────────────────────

function LiveMatchCard({ match, onPress }: { match: Match; onPress: () => void }) {
  const inn1 = match.innings?.[0];
  const inn2 = match.innings?.[1];
  const currentInn = inn2 || inn1;
  const flashAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const crr = currentInn ? calcCRR(currentInn.runs, currentInn.balls) : 0;
  const target = inn2 && inn1 ? inn1.runs + 1 : null;
  const rrr = target && inn2 ? calcRRR(target, inn2.runs, (match.overs * 6) - inn2.balls) : null;
  const overStr = currentInn ? `${Math.floor(currentInn.balls / 6)}.${currentInn.balls % 6}` : '0.0';

  const isPowerplay = match.powerplayEnabled && currentInn &&
    Math.floor(currentInn.balls / 6) < (match.powerplayOvers ?? 2);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.liveCard}>
      {isPowerplay && <PowerplayBar />}
      <View style={styles.scanline} />

      <View style={styles.liveBadgeRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Animated.View style={{ opacity: flashAnim }}>
            <View style={styles.liveDot} />
          </Animated.View>
          <Text style={styles.liveDotText}>LIVE</Text>
          {isPowerplay && <Badge label="POWERPLAY" color="gold" />}
        </View>
        <Text style={styles.formatText}>{match.overs} OV · {match.matchType?.toUpperCase()}</Text>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamLeft}>
          <View style={styles.flagCircle}>
            <Text style={styles.flagText}>{match.team1Code?.slice(0, 2)}</Text>
          </View>
          <Text style={styles.teamName}>{match.team1Name}</Text>
          <Text style={styles.teamCode}>{match.team1Code}</Text>
          {inn1 && inn1.battingTeamId === match.team1Id && (
            <Text style={styles.scoreSmall}>{inn1.runs}/{inn1.wickets}</Text>
          )}
          {inn2 && inn2.battingTeamId === match.team1Id && (
            <Text style={styles.scoreSmall}>{inn2.runs}/{inn2.wickets}</Text>
          )}
        </View>

        <View style={styles.scoreCenter}>
          {currentInn ? (
            <>
              <Text style={styles.scoreMain}>{currentInn.runs}/{currentInn.wickets}</Text>
              <Text style={styles.scoreOvers}>({overStr} ov)</Text>
              <View style={styles.inningsBadge}>
                <Text style={styles.inningsBadgeText}>
                  {currentInn.battingTeamId === match.team1Id ? match.team1Code : match.team2Code} BAT
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.vsBadge}>VS</Text>
          )}
        </View>

        <View style={styles.teamRight}>
          <View style={styles.flagCircle}>
            <Text style={styles.flagText}>{match.team2Code?.slice(0, 2)}</Text>
          </View>
          <Text style={[styles.teamName, { textAlign: 'right' }]}>{match.team2Name}</Text>
          <Text style={[styles.teamCode, { textAlign: 'right' }]}>{match.team2Code}</Text>
          {inn1 && inn1.battingTeamId === match.team2Id && (
            <Text style={[styles.scoreSmall, { textAlign: 'right' }]}>{inn1.runs}/{inn1.wickets}</Text>
          )}
        </View>
      </View>

      <View style={styles.statsStrip}>
        <StatItem label="CRR" value={crr.toFixed(2)} color={crr > 8 ? Colors.green : crr > 5 ? Colors.yellow : Colors.text} />
        {rrr !== null ? (
          <StatItem label="RRR" value={rrr.toFixed(2)} color={rrr > 10 ? Colors.red : rrr > 7 ? Colors.yellow : Colors.green} />
        ) : (
          <StatItem label="OVERS" value={overStr} />
        )}
        <StatItem label="WKTS LEFT" value={String(10 - (currentInn?.wickets ?? 0))} />
      </View>

      {target && inn2 && (
        <View style={styles.targetStrip}>
          <Text style={styles.targetText}>
            Need <Text style={{ color: Colors.red, fontWeight: '700' }}>{target - inn2.runs}</Text> from{' '}
            <Text style={{ color: Colors.yellow, fontWeight: '700' }}>{(match.overs * 6) - inn2.balls}</Text> balls
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function PowerplayBar() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const bgColor = anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,217,61,0.15)', 'rgba(255,217,61,0.4)'] });
  return <Animated.View style={[styles.powerplayBar, { backgroundColor: bgColor }]} />;
}

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={statStyles.item}>
      <Text style={[statStyles.val, color && { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  val: { fontSize: 17, fontWeight: '700', color: Colors.text },
  label: { fontSize: 9, color: Colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 },
});

function MatchCard({ match, status }: { match: Match; status: 'upcoming' | 'completed' }) {
  const inn1 = match.innings?.[0];
  const inn2 = match.innings?.[1];
  return (
    <View style={mcStyles.card}>
      <View style={mcStyles.hdr}>
        <Text style={mcStyles.hdrText} numberOfLines={1}>{match.tournamentName ?? 'Match'}</Text>
        <Badge label={status === 'completed' ? 'DONE' : 'SOON'} color={status === 'completed' ? 'green' : 'grey'} />
      </View>
      <View style={mcStyles.body}>
        <View style={mcStyles.teamsRow}>
          <Text style={mcStyles.teamName}>{match.team1Name}</Text>
          <Text style={mcStyles.vs}>VS</Text>
          <Text style={[mcStyles.teamName, { textAlign: 'right' }]}>{match.team2Name}</Text>
        </View>
        {status === 'completed' && inn1 && (
          <View style={mcStyles.scoresRow}>
            <Text style={mcStyles.score}>
              {match.team1Code} <Text style={{ color: Colors.cyan }}>{inn1.battingTeamId === match.team1Id ? `${inn1.runs}/${inn1.wickets}` : (inn2 ? `${inn2.runs}/${inn2.wickets}` : '--')}</Text>
            </Text>
            <Text style={mcStyles.score}>
              {match.team2Code} <Text style={{ color: Colors.cyan }}>{inn1.battingTeamId === match.team2Id ? `${inn1.runs}/${inn1.wickets}` : (inn2 ? `${inn2.runs}/${inn2.wickets}` : '--')}</Text>
            </Text>
          </View>
        )}
        {match.resultDesc && (
          <Text style={mcStyles.result} numberOfLines={2}>{match.resultDesc}</Text>
        )}
      </View>
    </View>
  );
}

const mcStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, marginHorizontal: Spacing.md, marginBottom: 8, overflow: 'hidden', ...Shadow.card,
  },
  hdr: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(0,180,255,0.04)', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  hdrText: { fontSize: 11, color: Colors.muted, letterSpacing: 0.3, flex: 1, marginRight: 8 },
  body: { padding: 12 },
  teamsRow: { flexDirection: 'row', alignItems: 'center' },
  teamName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  vs: { color: Colors.muted, fontSize: 11, fontWeight: '600', paddingHorizontal: 12 },
  scoresRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  score: { fontSize: 13, fontWeight: '600', color: Colors.text },
  result: { fontSize: 11, color: Colors.green, marginTop: 6, lineHeight: 16 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { fontSize: 26 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.cyan, letterSpacing: 2 },
  headerSub: { fontSize: 9, color: Colors.muted, letterSpacing: 2, marginTop: 1 },
  signInBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.cyan + '50',
    backgroundColor: 'rgba(0,212,255,0.06)',
  },
  signInText: { fontSize: 13, fontWeight: '700', color: Colors.cyan, letterSpacing: 0.4 },
  userPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  userDot: { width: 8, height: 8, borderRadius: 4 },
  userPillText: { fontSize: 12, fontWeight: '700' },

  // Live Banner
  liveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(255,71,87,0.08)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,71,87,0.2)',
  },
  liveIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  liveBannerText: { fontSize: 11, fontWeight: '700', color: Colors.red, letterSpacing: 1.2 },

  // Live Card
  liveCard: {
    marginHorizontal: 12, marginBottom: 10,
    backgroundColor: 'rgba(13,32,64,0.95)',
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: 20, overflow: 'hidden', ...Shadow.glow,
  },
  powerplayBar: { height: 4 },
  scanline: { height: 1.5, backgroundColor: Colors.cyan, opacity: 0.4 },
  liveBadgeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8,
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.red },
  liveDotText: { fontSize: 11, fontWeight: '800', color: Colors.red, letterSpacing: 1.5 },
  formatText: { fontSize: 10, color: Colors.muted, letterSpacing: 0.8 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 14 },
  teamLeft: { flex: 1, alignItems: 'flex-start', gap: 4 },
  teamRight: { flex: 1, alignItems: 'flex-end', gap: 4 },
  flagCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,180,255,0.08)',
    borderWidth: 2, borderColor: 'rgba(0,180,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  flagText: { fontSize: 13, fontWeight: '800', color: Colors.cyan },
  teamName: { fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: 0.2 },
  teamCode: { fontSize: 10, color: Colors.muted, letterSpacing: 1 },
  scoreSmall: { fontSize: 14, fontWeight: '700', color: Colors.cyan },
  scoreCenter: { flex: 0, alignItems: 'center', paddingHorizontal: 14, gap: 4 },
  scoreMain: { fontSize: 42, fontWeight: '800', color: Colors.cyan, lineHeight: 48 },
  scoreOvers: { fontSize: 11, color: Colors.muted, letterSpacing: 0.6 },
  inningsBadge: {
    backgroundColor: 'rgba(0,212,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)',
  },
  inningsBadgeText: { fontSize: 9, color: Colors.cyan, fontWeight: '700', letterSpacing: 0.8 },
  vsBadge: { fontSize: 14, fontWeight: '700', color: Colors.muted, letterSpacing: 2 },
  statsStrip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border },
  targetStrip: {
    backgroundColor: 'rgba(255,71,87,0.1)', borderTopWidth: 1, borderTopColor: 'rgba(255,71,87,0.2)',
    paddingHorizontal: 16, paddingVertical: 7, alignItems: 'center',
  },
  targetText: { fontSize: 12, color: 'rgba(232,244,255,0.7)' },

  // Empty state
  noLiveCard: {
    marginHorizontal: 12, marginBottom: 8, padding: 28,
    alignItems: 'center', backgroundColor: 'rgba(14,32,64,0.7)',
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
  },
  noLiveIcon: { fontSize: 32, marginBottom: 8, opacity: 0.4 },
  noLiveText: { fontSize: 14, color: Colors.muted, fontWeight: '600' },
  noLiveSub: { fontSize: 11, color: Colors.muted + '80', marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.cyan, textAlign: 'center', letterSpacing: 1, marginBottom: 20 },
  modeSelector: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
    backgroundColor: 'rgba(0,180,255,0.04)',
    borderRadius: Radius.md, padding: 4, borderWidth: 1, borderColor: Colors.border,
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.sm, alignItems: 'center' },
  modeBtnActive: { backgroundColor: 'rgba(0,180,255,0.15)' },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: Colors.muted },
  inputLabel: { fontSize: 10, color: Colors.cyan, letterSpacing: 1.2, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(0,180,255,0.06)', borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.text, fontSize: 15,
  },
  modalSignInBtn: {
    marginTop: 20, backgroundColor: Colors.cyan, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center',
  },
  modalSignInBtnText: { fontSize: 15, fontWeight: '800', color: Colors.bg, letterSpacing: 0.5 },
  modalCancel: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: Colors.muted },
});
