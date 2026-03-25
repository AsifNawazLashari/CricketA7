import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useMatch } from '../../context/MatchContext';
import { getTournaments, computePlayerStats, computeStandingsFromMatches, getMatchesByTournament, calcStrikeRate, calcEconomy } from '../../services/firebase';
import { Badge, SectionTitle, EmptyState, Loader, SegmentControl } from '../../components/UI';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';
import { Match, Tournament, TournamentStanding, PlayerStatsEntry } from '../../types';

type StatsTab = 'match' | 'tournament' | 'players';

export default function StatsScreen() {
  const { allMatches, isLoadingMatches } = useMatch();
  const [tab, setTab] = useState<StatsTab>('match');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [tournamentMatches, setTournamentMatches] = useState<Match[]>([]);
  const [loadingTournament, setLoadingTournament] = useState(false);

  useEffect(() => { getTournaments().then(setTournaments); }, []);

  useEffect(() => {
    if (selectedTournament) {
      setLoadingTournament(true);
      getMatchesByTournament(selectedTournament.id).then((m) => {
        setTournamentMatches(m);
        setLoadingTournament(false);
      });
    }
  }, [selectedTournament]);

  const completedMatches = allMatches.filter((m) => m.status === 'completed');

  if (isLoadingMatches) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.5 }}>STATISTICS</Text>
      </View>
      <Loader text="Loading stats..." />
    </SafeAreaView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SegmentControl
        options={[
          { label: 'Match Stats', value: 'match' },
          { label: 'Tournament', value: 'tournament' },
          { label: 'Top Players', value: 'players' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as StatsTab)}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {tab === 'match' && (
          <MatchStatsTab
            matches={completedMatches}
            selectedMatch={selectedMatch}
            onSelectMatch={setSelectedMatch}
          />
        )}
        {tab === 'tournament' && (
          <TournamentStatsTab
            tournaments={tournaments}
            selectedTournament={selectedTournament}
            onSelectTournament={(t) => { setSelectedTournament(t); setTournamentMatches([]); }}
            matches={tournamentMatches}
            loading={loadingTournament}
          />
        )}
        {tab === 'players' && (
          <TopPlayersTab matches={allMatches} />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Match Stats Tab ──────────────────────────────────────────────────────────

function MatchStatsTab({ matches, selectedMatch, onSelectMatch }: {
  matches: Match[]; selectedMatch: Match | null; onSelectMatch: (m: Match | null) => void;
}) {
  if (matches.length === 0) {
    return <EmptyState icon="📊" title="No Completed Matches" desc="Stats appear after matches are completed." />;
  }

  if (selectedMatch) {
    return <MatchScorecard match={selectedMatch} onBack={() => onSelectMatch(null)} />;
  }

  return (
    <View>
      <SectionTitle title="📋 Select Match" />
      {matches.map((m) => (
        <TouchableOpacity key={m.id} style={s.matchItem} onPress={() => onSelectMatch(m)} activeOpacity={0.8}>
          <View style={s.matchItemHeader}>
            <Text style={s.matchItemTitle}>{m.team1Name} vs {m.team2Name}</Text>
            <Badge label="COMPLETED" color="green" />
          </View>
          <Text style={s.matchItemSub}>{m.overs} overs · {m.venue ?? 'Venue TBC'}</Text>
          {m.resultDesc && <Text style={s.resultDesc}>{m.resultDesc}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MatchScorecard({ match, onBack }: { match: Match; onBack: () => void }) {
  return (
    <View>
      <TouchableOpacity onPress={onBack} style={s.backRow}>
        <Text style={s.backText}>← Back to matches</Text>
      </TouchableOpacity>

      <View style={s.resultCard}>
        <Text style={s.resultTitle}>{match.team1Name} vs {match.team2Name}</Text>
        {match.resultDesc && <Text style={s.resultDesc2}>{match.resultDesc}</Text>}
        <View style={s.resultBadges}>
          <Badge label={match.matchType === 'tapeball' ? '🎾 Tapeball' : '🏏 Leather'} color={match.matchType === 'tapeball' ? 'yellow' : 'cyan'} />
          <Badge label={`${match.overs} Overs`} color="grey" />
          {match.venue && <Badge label={`📍 ${match.venue}`} color="grey" />}
        </View>
      </View>

      {match.innings.map((inn) => {
        const battingTeamName = inn.battingTeamId === match.team1Id ? match.team1Name : match.team2Name;
        const bowlingTeamName = inn.bowlingTeamId === match.team1Id ? match.team1Name : match.team2Name;
        const ballsPerOver = match.rules?.ballsPerOver ?? 6;

        return (
          <View key={inn.id} style={s.inningsBlock}>
            <View style={s.inningsHeader}>
              <Text style={s.inningsTeam}>{battingTeamName} Innings</Text>
              <Text style={s.inningsScore}>{inn.runs}/{inn.wickets} ({Math.floor(inn.balls / ballsPerOver)}.{inn.balls % ballsPerOver} ov)</Text>
            </View>

            {inn.extras > 0 && (
              <View style={s.extrasRow}>
                <Text style={s.extrasLabel}>Extras</Text>
                <Text style={s.extrasVal}>{inn.extras}</Text>
              </View>
            )}

            <SectionTitle title="BATTING" />
            <View style={s.scorecardTable}>
              <View style={s.tableHeader}>
                <Text style={[s.thCell, { flex: 2 }]}>Batter</Text>
                <Text style={s.thCell}>R</Text>
                <Text style={s.thCell}>B</Text>
                <Text style={s.thCell}>4s</Text>
                <Text style={s.thCell}>6s</Text>
                <Text style={s.thCell}>SR</Text>
              </View>
              {inn.batting.map((bat, i) => (
                <View key={i} style={[s.tableRow, bat.isStriker && !inn.isComplete && s.strikerRow]}>
                  <View style={{ flex: 2 }}>
                    <Text style={s.batName}>{bat.playerName}{bat.isStriker && !inn.isComplete ? ' *' : ''}</Text>
                    {bat.isOut && bat.dismissal && <Text style={s.dismissal}>{bat.dismissal}</Text>}
                    {!bat.isOut && inn.isComplete && <Text style={s.dismissal}>not out</Text>}
                  </View>
                  <Text style={[s.tdCell, bat.runs >= 50 ? s.milestone : null]}>{bat.runs}</Text>
                  <Text style={s.tdCell}>{bat.balls}</Text>
                  <Text style={s.tdCell}>{bat.fours}</Text>
                  <Text style={s.tdCell}>{bat.sixes}</Text>
                  <Text style={s.tdCell}>{bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(0) : '–'}</Text>
                </View>
              ))}
            </View>

            <SectionTitle title="BOWLING" />
            <View style={s.scorecardTable}>
              <View style={s.tableHeader}>
                <Text style={[s.thCell, { flex: 2 }]}>Bowler</Text>
                <Text style={s.thCell}>O</Text>
                <Text style={s.thCell}>R</Text>
                <Text style={s.thCell}>W</Text>
                <Text style={s.thCell}>Wd</Text>
                <Text style={s.thCell}>Nb</Text>
                <Text style={s.thCell}>Eco</Text>
              </View>
              {inn.bowling.map((bowl, i) => {
                const overs = Math.floor(bowl.balls / ballsPerOver);
                const rem = bowl.balls % ballsPerOver;
                return (
                  <View key={i} style={[s.tableRow, bowl.isActive && !inn.isComplete && s.strikerRow]}>
                    <Text style={[s.tdCell, { flex: 2, textAlign: 'left', color: Colors.text }]} numberOfLines={1}>{bowl.playerName}</Text>
                    <Text style={s.tdCell}>{rem === 0 ? overs : `${overs}.${rem}`}</Text>
                    <Text style={s.tdCell}>{bowl.runs}</Text>
                    <Text style={[s.tdCell, bowl.wickets >= 3 ? s.milestoneGold : null]}>{bowl.wickets}</Text>
                    <Text style={s.tdCell}>{bowl.wides ?? 0}</Text>
                    <Text style={s.tdCell}>{bowl.noBalls ?? 0}</Text>
                    <Text style={s.tdCell}>{bowl.balls > 0 ? ((bowl.runs / bowl.balls) * 6).toFixed(1) : '–'}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Tournament Stats Tab ─────────────────────────────────────────────────────

function TournamentStatsTab({ tournaments, selectedTournament, onSelectTournament, matches, loading }: {
  tournaments: Tournament[];
  selectedTournament: Tournament | null;
  onSelectTournament: (t: Tournament) => void;
  matches: Match[];
  loading: boolean;
}) {
  if (tournaments.length === 0) {
    return <EmptyState icon="🏆" title="No Tournaments" desc="Create a tournament from the Manage tab." />;
  }

  const standings = selectedTournament ? computeStandingsFromMatches(matches) : [];

  return (
    <View>
      <SectionTitle title="🏆 Select Tournament" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, marginBottom: 12 }}>
        {tournaments.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[s.tChip, selectedTournament?.id === t.id && s.tChipActive]}
            onPress={() => onSelectTournament(t)}
          >
            <Text style={[s.tChipText, selectedTournament?.id === t.id && { color: Colors.cyan }]}>{t.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedTournament && (
        <>
          <View style={s.tournamentInfo}>
            <Text style={s.tournamentInfoName}>{selectedTournament.name}</Text>
            <View style={s.tournamentInfoBadges}>
              <Badge label={selectedTournament.format.toUpperCase()} color="cyan" />
              <Badge label={`${selectedTournament.overs} Overs`} color="grey" />
              {selectedTournament.matchType && (
                <Badge label={selectedTournament.matchType === 'tapeball' ? '🎾 Tapeball' : '🏏 Leather'} color={selectedTournament.matchType === 'tapeball' ? 'yellow' : 'cyan'} />
              )}
            </View>
          </View>

          {loading ? (
            <Loader text="Loading tournament..." />
          ) : (
            <>
              <SectionTitle title="📊 Points Table" />
              {standings.length === 0 ? (
                <EmptyState icon="📊" title="No Results Yet" desc="Complete matches to see standings." />
              ) : (
                <View style={s.standingsTable}>
                  <View style={s.standingsHeader}>
                    <Text style={[s.shCell, { flex: 3, textAlign: 'left' }]}>Team</Text>
                    <Text style={s.shCell}>P</Text>
                    <Text style={s.shCell}>W</Text>
                    <Text style={s.shCell}>L</Text>
                    <Text style={s.shCell}>NRR</Text>
                    <Text style={s.shCell}>Pts</Text>
                  </View>
                  {standings.map((row, i) => (
                    <View key={row.teamId} style={[s.standingsRow, i === 0 && s.standingsFirst]}>
                      <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {i === 0 && <Text style={{ fontSize: 12 }}>🥇</Text>}
                        {i === 1 && <Text style={{ fontSize: 12 }}>🥈</Text>}
                        {i === 2 && <Text style={{ fontSize: 12 }}>🥉</Text>}
                        {i >= 3 && <Text style={s.rank}>{i + 1}</Text>}
                        <Text style={s.standingTeam} numberOfLines={1}>{row.teamName}</Text>
                      </View>
                      <Text style={s.sdCell}>{row.played}</Text>
                      <Text style={[s.sdCell, { color: Colors.green }]}>{row.won}</Text>
                      <Text style={[s.sdCell, { color: Colors.red }]}>{row.lost}</Text>
                      <Text style={s.sdCell}>{row.nrr >= 0 ? '+' : ''}{row.nrr.toFixed(2)}</Text>
                      <Text style={[s.sdCell, { color: Colors.yellow, fontWeight: '900' }]}>{row.points}</Text>
                    </View>
                  ))}
                </View>
              )}

              <SectionTitle title="🏏 Match Results" />
              {matches.filter(m => m.status === 'completed').length === 0 ? (
                <EmptyState icon="🏏" title="No Completed Matches" desc="Complete matches to see results here." />
              ) : (
                matches.filter(m => m.status === 'completed').map((m) => (
                  <View key={m.id} style={s.resultRow}>
                    <View style={s.resultRowTeams}>
                      <Text style={[s.resultRowTeam, m.winnerId === m.team1Id && s.winnerTeam]}>{m.team1Name}</Text>
                      <Text style={s.resultRowVs}>vs</Text>
                      <Text style={[s.resultRowTeam, m.winnerId === m.team2Id && s.winnerTeam]}>{m.team2Name}</Text>
                    </View>
                    {m.resultDesc && <Text style={s.resultRowDesc}>{m.resultDesc}</Text>}
                    {m.stage && <Badge label={m.stage} color="grey" />}
                  </View>
                ))
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}

// ─── Top Players Tab ──────────────────────────────────────────────────────────

function TopPlayersTab({ matches }: { matches: Match[] }) {
  const [view, setView] = useState<'batting' | 'bowling'>('batting');
  const stats = computePlayerStats(matches);

  const batters = stats
    .filter((e) => e.balls > 0)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 10);

  const bowlers = stats
    .filter((e) => e.ballsBowled > 0)
    .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
    .slice(0, 10);

  return (
    <View>
      <View style={s.viewToggle}>
        <TouchableOpacity
          style={[s.viewToggleBtn, view === 'batting' && s.viewToggleBtnActive]}
          onPress={() => setView('batting')}
        >
          <Text style={[s.viewToggleBtnText, view === 'batting' && { color: Colors.cyan }]}>🏏 Top Batters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.viewToggleBtn, view === 'bowling' && s.viewToggleBtnActive]}
          onPress={() => setView('bowling')}
        >
          <Text style={[s.viewToggleBtnText, view === 'bowling' && { color: Colors.cyan }]}>⚾ Top Bowlers</Text>
        </TouchableOpacity>
      </View>

      {view === 'batting' && (
        <View>
          <SectionTitle title="🏏 Most Runs" />
          {batters.length === 0 ? (
            <EmptyState icon="🏏" title="No Data" desc="Play some matches to see player stats." />
          ) : (
            batters.map((p, i) => (
              <View key={`${p.playerId}_${i}`} style={[s.playerStatRow, i === 0 && s.topStatRow]}>
                <Text style={s.statRank}>{i + 1}</Text>
                <View style={s.statInfo}>
                  <Text style={s.statName}>{p.playerName}</Text>
                  <Text style={s.statTeam}>{p.teamName}</Text>
                </View>
                <View style={s.statValues}>
                  <View style={s.statMainVal}>
                    <Text style={s.statBigNum}>{p.runs}</Text>
                    <Text style={s.statBigLabel}>Runs</Text>
                  </View>
                  <View style={s.statSecondary}>
                    <Text style={s.statSmall}>{p.balls}b</Text>
                    <Text style={s.statSmall}>{p.fours}×4</Text>
                    <Text style={s.statSmall}>{p.sixes}×6</Text>
                    <Text style={s.statSmall}>SR {p.strikeRate.toFixed(0)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {view === 'bowling' && (
        <View>
          <SectionTitle title="⚾ Most Wickets" />
          {bowlers.length === 0 ? (
            <EmptyState icon="⚾" title="No Data" desc="Play some matches to see bowling stats." />
          ) : (
            bowlers.map((p, i) => (
              <View key={`${p.playerId}_bowl_${i}`} style={[s.playerStatRow, i === 0 && s.topStatRow]}>
                <Text style={s.statRank}>{i + 1}</Text>
                <View style={s.statInfo}>
                  <Text style={s.statName}>{p.playerName}</Text>
                  <Text style={s.statTeam}>{p.teamName}</Text>
                </View>
                <View style={s.statValues}>
                  <View style={s.statMainVal}>
                    <Text style={[s.statBigNum, { color: Colors.red }]}>{p.wickets}</Text>
                    <Text style={s.statBigLabel}>Wkts</Text>
                  </View>
                  <View style={s.statSecondary}>
                    <Text style={s.statSmall}>{p.runsConceded}R</Text>
                    <Text style={s.statSmall}>{Math.floor(p.ballsBowled / 6)}.{p.ballsBowled % 6} ov</Text>
                    <Text style={s.statSmall}>Eco {p.economy.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  matchItem: { marginHorizontal: 12, marginBottom: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 14 },
  matchItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  matchItemTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  matchItemSub: { fontSize: 11, color: Colors.muted },
  resultDesc: { fontSize: 12, color: Colors.green, marginTop: 4 },
  backRow: { padding: 14, paddingBottom: 4 },
  backText: { fontSize: 13, color: Colors.cyan, fontWeight: '700' },
  resultCard: { margin: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 14 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  resultDesc2: { fontSize: 13, color: Colors.green, marginBottom: 8 },
  resultBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  inningsBlock: { marginBottom: 4 },
  inningsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 12, marginBottom: 6, backgroundColor: 'rgba(0,180,255,0.06)', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 10 },
  inningsTeam: { fontSize: 13, fontWeight: '700', color: Colors.cyan },
  inningsScore: { fontSize: 16, fontWeight: '900', color: Colors.text },
  extrasRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 12, paddingHorizontal: 8, paddingVertical: 4 },
  extrasLabel: { fontSize: 11, color: Colors.muted },
  extrasVal: { fontSize: 11, color: Colors.text },
  scorecardTable: { marginHorizontal: 12, marginBottom: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: 'rgba(0,180,255,0.08)', paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  thCell: { flex: 1, fontSize: 9, fontWeight: '700', color: Colors.muted, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.border2 },
  strikerRow: { backgroundColor: 'rgba(0,180,255,0.04)' },
  batName: { fontSize: 12, fontWeight: '600', color: Colors.text },
  dismissal: { fontSize: 9, color: Colors.muted, fontStyle: 'italic' },
  tdCell: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.text2, textAlign: 'center' },
  milestone: { color: Colors.yellow },
  milestoneGold: { color: Colors.green },

  tChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)' },
  tChipActive: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.12)' },
  tChipText: { fontSize: 12, fontWeight: '700', color: Colors.muted },
  tournamentInfo: { marginHorizontal: 12, marginBottom: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 14 },
  tournamentInfoName: { fontSize: 18, fontWeight: '700', color: Colors.cyan, marginBottom: 8 },
  tournamentInfoBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  standingsTable: { marginHorizontal: 12, marginBottom: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden' },
  standingsHeader: { flexDirection: 'row', backgroundColor: 'rgba(0,180,255,0.08)', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  shCell: { flex: 1, fontSize: 9, fontWeight: '700', color: Colors.muted, textAlign: 'center', textTransform: 'uppercase' },
  standingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border2 },
  standingsFirst: { backgroundColor: 'rgba(255,217,61,0.04)' },
  rank: { fontSize: 11, color: Colors.muted, width: 20, textAlign: 'center' },
  standingTeam: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text },
  sdCell: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text2, textAlign: 'center' },
  resultRow: { marginHorizontal: 12, marginBottom: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12 },
  resultRowTeams: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  resultRowTeam: { flex: 1, fontSize: 13, color: Colors.text2 },
  winnerTeam: { fontWeight: '700', color: Colors.green },
  resultRowVs: { fontSize: 11, color: Colors.muted, paddingHorizontal: 8 },
  resultRowDesc: { fontSize: 11, color: Colors.yellow, marginBottom: 4 },

  viewToggle: { flexDirection: 'row', margin: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden' },
  viewToggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  viewToggleBtnActive: { backgroundColor: 'rgba(0,180,255,0.1)' },
  viewToggleBtnText: { fontSize: 12, fontWeight: '700', color: Colors.muted },
  playerStatRow: { marginHorizontal: 12, marginBottom: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 12, flexDirection: 'row', alignItems: 'center' },
  topStatRow: { borderColor: Colors.yellow, backgroundColor: 'rgba(255,217,61,0.04)' },
  statRank: { fontSize: 18, fontWeight: '900', color: Colors.muted, width: 28, textAlign: 'center' },
  statInfo: { flex: 1, paddingHorizontal: 10 },
  statName: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  statTeam: { fontSize: 10, color: Colors.muted },
  statValues: { alignItems: 'flex-end' },
  statMainVal: { alignItems: 'center', marginBottom: 4 },
  statBigNum: { fontSize: 22, fontWeight: '900', color: Colors.cyan },
  statBigLabel: { fontSize: 8, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  statSecondary: { flexDirection: 'row', gap: 8 },
  statSmall: { fontSize: 9, color: Colors.muted },
});
