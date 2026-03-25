import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMatch } from '../../context/MatchContext';
import { getTournaments, subscribeUpcomingMatches } from '../../services/firebase';
import { Badge, SectionTitle, EmptyState, Loader, SegmentControl } from '../../components/UI';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';
import { Match, Tournament } from '../../types';

type FilterType = 'all' | 'tournament' | 'standalone';

export default function FixtureScreen() {
  const { allMatches, isLoadingMatches } = useMatch();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Safe tournament load — won't crash if Firebase isn't configured
  const loadTournaments = useCallback(async () => {
    try {
      const ts = await getTournaments();
      setTournaments(ts ?? []);
    } catch { setTournaments([]); }
  }, []);

  useEffect(() => {
    loadTournaments();
    // Subscribe to upcoming matches — safe subscription
    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeUpcomingMatches(() => {});
    } catch { /* Firebase not configured yet */ }
    return () => { try { unsub?.(); } catch {} };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTournaments().finally(() => setRefreshing(false));
  }, [loadTournaments]);

  const allUpcoming = (allMatches ?? []).filter((m) =>
    m?.status === 'scheduled' || m?.status === 'toss'
  );

  const filtered = allUpcoming.filter((m) => {
    if (!m) return false;
    if (filter === 'tournament') {
      if (selectedTournament) return m.tournamentId === selectedTournament;
      return !!m.tournamentId && m.tournamentName !== 'Quick Play';
    }
    if (filter === 'standalone') return !m.tournamentId || m.tournamentName === 'Quick Play';
    return true;
  });

  const grouped = groupByTournament(filtered);

  if (isLoadingMatches) return <Loader text="Loading fixtures..." />;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>FIXTURES</Text>
        <Text style={s.headerSub}>{allUpcoming.length} upcoming</Text>
      </View>

      <SegmentControl
        options={[
          { label: 'All', value: 'all' },
          { label: 'Tournament', value: 'tournament' },
          { label: 'Standalone', value: 'standalone' },
        ]}
        value={filter}
        onChange={(v) => { setFilter(v as FilterType); setSelectedTournament(null); }}
      />

      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cyan} />}
      >
        {/* Tournament filter chips */}
        {filter === 'tournament' && tournaments.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 8 }}>
            <TouchableOpacity style={[s.chip, !selectedTournament && s.chipActive]} onPress={() => setSelectedTournament(null)}>
              <Text style={[s.chipText, !selectedTournament && { color: Colors.cyan }]}>All</Text>
            </TouchableOpacity>
            {tournaments.map((t) => (
              <TouchableOpacity key={t.id} style={[s.chip, selectedTournament === t.id && s.chipActive]} onPress={() => setSelectedTournament(t.id)}>
                <Text style={[s.chipText, selectedTournament === t.id && { color: Colors.cyan }]} numberOfLines={1}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No Upcoming Fixtures"
            desc={filter !== 'all' ? 'Try switching the filter above.' : 'Create matches from the Manage tab.'}
          />
        ) : (
          grouped.map(({ tournamentName, matches }) => (
            <View key={tournamentName}>
              {tournamentName !== 'Standalone Matches' ? (
                <View style={s.groupHeader}>
                  <Ionicons name="trophy" size={13} color={Colors.yellow} />
                  <Text style={s.groupHeaderText}>{tournamentName}</Text>
                  <View style={s.groupCount}>
                    <Text style={s.groupCountText}>{matches.length}</Text>
                  </View>
                </View>
              ) : (
                <View style={s.groupHeader}>
                  <Ionicons name="calendar" size={13} color={Colors.muted} />
                  <Text style={[s.groupHeaderText, { color: Colors.muted }]}>Standalone Matches</Text>
                </View>
              )}
              {matches.map((m) => <MatchFixtureCard key={m.id} match={m} />)}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MatchFixtureCard({ match }: { match: Match }) {
  if (!match?.team1Name || !match?.team2Name) return null;

  const formatLabel = match.matchFormat ?? (
    match.overs <= 6 ? 'T6' : match.overs <= 8 ? 'T8' : match.overs <= 10 ? 'T10' :
    match.overs <= 20 ? 'T20' : match.overs <= 50 ? 'ODI' : `${match.overs}ov`
  );

  const isToss = match.status === 'toss';

  return (
    <View style={fc.card}>
      {/* Card Header */}
      <View style={fc.cardTop}>
        <View style={fc.topLeft}>
          <Badge label={formatLabel} color="grey" />
          <Badge label={match.matchType === 'tapeball' ? 'Tapeball' : 'Leather'} color={match.matchType === 'tapeball' ? 'yellow' : 'cyan'} />
        </View>
        <Badge
          label={isToss ? 'TOSS' : 'UPCOMING'}
          color={isToss ? 'gold' : 'grey'}
          dot={isToss}
        />
      </View>

      {/* Teams Row */}
      <View style={fc.teamsRow}>
        <View style={fc.teamBlock}>
          <Text style={fc.teamCode}>{match.team1Code ?? '???'}</Text>
          <Text style={fc.teamName} numberOfLines={1}>{match.team1Name}</Text>
        </View>

        <View style={fc.vsBlock}>
          <Text style={fc.vs}>VS</Text>
          <Text style={fc.overs}>{match.overs}ov</Text>
          {match.powerplayEnabled && (
            <View style={fc.ppBadge}>
              <Text style={fc.ppText}>PP</Text>
            </View>
          )}
        </View>

        <View style={[fc.teamBlock, { alignItems: 'flex-end' }]}>
          <Text style={fc.teamCode}>{match.team2Code ?? '???'}</Text>
          <Text style={fc.teamName} numberOfLines={1}>{match.team2Name}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={fc.footer}>
        <View style={fc.footerItem}>
          <Ionicons name="location-outline" size={11} color={Colors.muted} />
          <Text style={fc.footerText}>{match.venue ?? 'Venue TBC'}</Text>
        </View>
        <View style={fc.footerItem}>
          <Ionicons name="time-outline" size={11} color={Colors.muted} />
          <Text style={fc.footerText}>{match.scheduledAt ?? 'Date TBC'}</Text>
        </View>
      </View>

      {/* Tournament tag */}
      {match.tournamentName && match.tournamentName !== 'Quick Play' && (
        <View style={fc.tournamentTag}>
          <Ionicons name="trophy-outline" size={10} color={Colors.cyan} />
          <Text style={fc.tournamentTagText}>{match.tournamentName}</Text>
          {match.stage && <Text style={fc.tournamentTagText}> · {match.stage}</Text>}
          {match.roundNo && <Text style={fc.tournamentTagText}> · Round {match.roundNo}</Text>}
        </View>
      )}
    </View>
  );
}

function groupByTournament(matches: Match[]): { tournamentName: string; matches: Match[] }[] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    if (!m) continue;
    const key = m.tournamentName && m.tournamentName !== 'Quick Play' ? m.tournamentName : 'Standalone Matches';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  // Sort: named tournaments first, standalone last
  const entries = Array.from(map.entries());
  const named = entries.filter(([k]) => k !== 'Standalone Matches');
  const standalone = entries.filter(([k]) => k === 'Standalone Matches');
  return [...named, ...standalone].map(([tournamentName, matches]) => ({ tournamentName, matches }));
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.5 },
  headerSub: { fontSize: 11, color: Colors.muted },
  container: { flex: 1, backgroundColor: Colors.bg },
  chipRow: { flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)' },
  chipActive: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.12)' },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.muted },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, marginTop: 6 },
  groupHeaderText: { fontSize: 11, fontWeight: '800', color: Colors.yellow, letterSpacing: 0.6, textTransform: 'uppercase', flex: 1 },
  groupCount: { backgroundColor: 'rgba(255,217,61,0.15)', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  groupCountText: { fontSize: 10, fontWeight: '700', color: Colors.yellow },
});

const fc = StyleSheet.create({
  card: { marginHorizontal: 12, marginBottom: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.card },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, paddingBottom: 8, backgroundColor: 'rgba(0,180,255,0.04)', borderBottomWidth: 1, borderBottomColor: Colors.border },
  topLeft: { flexDirection: 'row', gap: 6 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 16 },
  teamBlock: { flex: 1 },
  teamCode: { fontSize: 24, fontWeight: '900', color: Colors.cyan, letterSpacing: 1 },
  teamName: { fontSize: 12, color: Colors.text2, marginTop: 2 },
  vsBlock: { alignItems: 'center', paddingHorizontal: 14, gap: 4 },
  vs: { fontSize: 13, fontWeight: '900', color: Colors.muted, letterSpacing: 2 },
  overs: { fontSize: 10, color: Colors.muted },
  ppBadge: { backgroundColor: 'rgba(255,217,61,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  ppText: { fontSize: 8, fontWeight: '800', color: Colors.yellow, letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, color: Colors.muted },
  tournamentTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingBottom: 8 },
  tournamentTagText: { fontSize: 10, color: Colors.cyan, fontWeight: '700', letterSpacing: 0.4 },
});
