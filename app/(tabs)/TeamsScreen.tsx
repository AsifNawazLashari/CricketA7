import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  subscribeTeams, createTeam, deleteTeam,
  addPlayer, removePlayer, updatePlayer, getTournaments,
} from '../../services/firebase';
import { BottomSheet } from '../../components/BottomSheet';
import { Btn, Badge, EmptyState, Loader, SectionTitle, FormField } from '../../components/UI';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';
import { Team, Player, Tournament, MatchType } from '../../types';

type PlayerRole = Player['role'];

const ROLE_ICONS: Record<PlayerRole, string> = {
  batsman: '🏏',
  bowler: '🎳',
  allrounder: '⚡',
  wicketkeeper: '🧤',
};

const ROLE_LABELS: Record<PlayerRole, string> = {
  batsman: 'Batsman',
  bowler: 'Bowler',
  allrounder: 'All-rounder',
  wicketkeeper: 'Wicketkeeper',
};

const TEAM_COLORS = ['#00d4ff', '#ffd93d', '#00ff88', '#ff4757', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];

export default function TeamsScreen() {
  const { hasRole, isOrganizer, user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getTournaments().then(setTournaments);
    const unsub = subscribeTeams((t) => { setTeams(t); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      const updated = teams.find((t) => t.id === selectedTeam.id);
      if (updated) setSelectedTeam(updated);
    }
  }, [teams]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleDeleteTeam = (team: Team) => {
    Alert.alert('Delete Team', `Delete "${team.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteTeam(team.id);
        if (selectedTeam?.id === team.id) setSelectedTeam(null);
        toast('Team deleted');
      }},
    ]);
  };

  const handleRemovePlayer = (player: Player) => {
    if (!selectedTeam) return;
    Alert.alert('Remove Player', `Remove "${player.name}" from the squad?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await removePlayer(selectedTeam.id, player.id);
        toast('Player removed');
      }},
    ]);
  };

  // Captain can only manage their assigned team
  const canManageTeam = (team: Team) => {
    if (isOrganizer()) return true;
    if (hasRole('captain') && user?.teamId === team.id) return true;
    return false;
  };

  if (loading) return <Loader text="Loading teams..." />;

  // Team detail view
  if (selectedTeam) {
    const canManage = canManageTeam(selectedTeam);
    return (
      <SafeAreaView style={s.safe}>
        {/* Sub-header */}
        <View style={s.subHeader}>
          <TouchableOpacity onPress={() => setSelectedTeam(null)} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.cyan} />
            <Text style={s.backText}>Teams</Text>
          </TouchableOpacity>
          <Text style={s.subHeaderTitle} numberOfLines={1}>{selectedTeam.name}</Text>
          {canManage && (
            <TouchableOpacity onPress={() => { setEditingPlayer(null); setShowAddPlayer(true); }} style={s.addPlayerBtn}>
              <Ionicons name="person-add" size={14} color={Colors.cyan} />
              <Text style={s.addPlayerBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Team Hero */}
          <View style={[s.teamHero, { borderTopColor: selectedTeam.color }]}>
            <View style={s.heroRow}>
              <View style={[s.colorCircle, { backgroundColor: selectedTeam.color }]}>
                <Text style={s.colorCircleText}>{selectedTeam.code.slice(0, 2)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroName}>{selectedTeam.name}</Text>
                <Text style={s.heroCode}>{selectedTeam.code}</Text>
              </View>
              <Badge
                label={selectedTeam.matchType === 'tapeball' ? 'Tapeball' : 'Leather'}
                color={selectedTeam.matchType === 'tapeball' ? 'yellow' : 'cyan'}
              />
            </View>
            <View style={s.heroStats}>
              {[
                { val: selectedTeam.players.length, label: 'Players' },
                { val: selectedTeam.players.filter((p) => p.role === 'batsman' || p.role === 'allrounder').length, label: 'Batsmen' },
                { val: selectedTeam.players.filter((p) => p.role === 'bowler' || p.role === 'allrounder').length, label: 'Bowlers' },
                { val: selectedTeam.players.filter((p) => p.role === 'wicketkeeper').length, label: 'WK' },
              ].map((stat) => (
                <View key={stat.label} style={s.heroStatItem}>
                  <Text style={s.heroStatVal}>{stat.val}</Text>
                  <Text style={s.heroStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <SectionTitle title="👥 Squad" />

          {selectedTeam.players.length === 0 ? (
            <EmptyState icon="👤" title="No Players Yet" desc={canManage ? "Tap Add to build the squad." : "No players in this squad."} />
          ) : (
            selectedTeam.players.map((p) => (
              <View key={p.id} style={s.playerCard}>
                <View style={s.playerCardLeft}>
                  <View style={[s.jerseyBox, { borderColor: selectedTeam.color + '60' }]}>
                    <Text style={[s.jerseyNum, { color: selectedTeam.color }]}>{p.jerseyNo ?? '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.playerName}>{p.name}</Text>
                    <View style={s.playerMeta}>
                      <Text style={s.playerRoleIcon}>{ROLE_ICONS[p.role]}</Text>
                      <Text style={s.playerRoleText}>{ROLE_LABELS[p.role]}</Text>
                      {p.battingStyle && <Text style={s.playerExtra}> · {p.battingStyle === 'right' ? 'RHB' : 'LHB'}</Text>}
                      {p.bowlingStyle && <Text style={s.playerExtra}> · {p.bowlingStyle}</Text>}
                    </View>
                  </View>
                </View>
                {canManage && (
                  <View style={s.playerActions}>
                    <TouchableOpacity onPress={() => { setEditingPlayer(p); setShowAddPlayer(true); }} style={s.editBtn}>
                      <Ionicons name="pencil" size={13} color={Colors.cyan} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemovePlayer(p)} style={s.removeBtn}>
                      <Ionicons name="close" size={14} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>

        <AddPlayerSheet
          visible={showAddPlayer}
          onClose={() => { setShowAddPlayer(false); setEditingPlayer(null); }}
          teamId={selectedTeam.id}
          editingPlayer={editingPlayer}
          onComplete={(msg) => { setShowAddPlayer(false); setEditingPlayer(null); toast(msg, 'success'); }}
        />
      </SafeAreaView>
    );
  }

  // Teams list view
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>TEAMS</Text>
        {isOrganizer() && (
          <TouchableOpacity onPress={() => setShowCreateTeam(true)} style={s.createBtn}>
            <Ionicons name="add" size={14} color={Colors.cyan} />
            <Text style={s.createBtnText}>New Team</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cyan} />}
      >
        {teams.length === 0 ? (
          <EmptyState icon="👥" title="No Teams Yet" desc={isOrganizer() ? "Create a team to start adding players." : "No teams found. Ask your organizer."} />
        ) : (
          teams.map((team) => (
            <TouchableOpacity key={team.id} style={s.teamCard} onPress={() => setSelectedTeam(team)} activeOpacity={0.82}>
              <View style={[s.teamAccent, { backgroundColor: team.color }]} />
              <View style={s.teamBody}>
                <View style={s.teamTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.teamName}>{team.name}</Text>
                    <Text style={s.teamCode}>{team.code}</Text>
                  </View>
                  <View style={s.teamRight}>
                    <Badge label={team.matchType === 'tapeball' ? 'Tapeball' : 'Leather'} color={team.matchType === 'tapeball' ? 'yellow' : 'cyan'} />
                    <Text style={s.teamPlayerCount}>{team.players.length} players</Text>
                  </View>
                </View>
                <View style={s.roleRow}>
                  {(['batsman', 'bowler', 'allrounder', 'wicketkeeper'] as PlayerRole[]).map((role) => {
                    const count = team.players.filter((p) => p.role === role).length;
                    if (!count) return null;
                    return (
                      <View key={role} style={s.roleChip}>
                        <Text style={s.roleChipText}>{ROLE_ICONS[role]} {count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              {isOrganizer() && (
                <TouchableOpacity onPress={() => handleDeleteTeam(team)} style={s.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={16} color={Colors.red + '80'} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <CreateTeamSheet
        visible={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        tournaments={tournaments}
        onComplete={(msg) => { setShowCreateTeam(false); toast(msg, 'success'); }}
      />
    </SafeAreaView>
  );
}

// ─── Create Team Sheet ────────────────────────────────────────────────────────

function CreateTeamSheet({ visible, onClose, tournaments, onComplete }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', code: '', color: TEAM_COLORS[0], tournamentId: '', matchType: 'tapeball' as MatchType });
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) { toast('Enter team name'); return; }
    if (form.name.trim().length < 2) { toast('Team name must be at least 2 characters'); return; }
    setCreating(true);
    try {
      await createTeam({
        name: form.name.trim(),
        code: form.code.trim() || form.name.slice(0, 3).toUpperCase(),
        color: form.color,
        tournamentId: form.tournamentId || 'standalone',
        matchType: form.matchType,
      });
      onComplete('Team created!');
      setForm({ name: '', code: '', color: TEAM_COLORS[0], tournamentId: '', matchType: 'tapeball' });
    } catch { toast('Error creating team'); }
    setCreating(false);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="👥 New Team">
      <FormField label="Team Name *" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="e.g. Karachi Kings" />
      <FormField label="Short Code (3-4 letters)" value={form.code} onChangeText={(v) => setForm((p) => ({ ...p, code: v.toUpperCase().slice(0, 4) }))} placeholder="e.g. KAR" maxLength={4} />

      <Text style={cs.label}>Format</Text>
      <View style={cs.row}>
        {(['tapeball', 'leather'] as MatchType[]).map((mt) => (
          <TouchableOpacity key={mt} style={[cs.optBtn, form.matchType === mt && cs.optActive]} onPress={() => setForm((p) => ({ ...p, matchType: mt }))}>
            <Text style={[cs.optText, form.matchType === mt && { color: Colors.cyan }]}>{mt === 'tapeball' ? '🎾 Tapeball' : '🏏 Leather'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={cs.label}>Team Color</Text>
      <View style={cs.colorRow}>
        {TEAM_COLORS.map((c) => (
          <TouchableOpacity key={c} style={[cs.colorDot, { backgroundColor: c }, form.color === c && cs.colorDotSelected]} onPress={() => setForm((p) => ({ ...p, color: c }))}>
            {form.color === c && <Ionicons name="checkmark" size={14} color="#000" />}
          </TouchableOpacity>
        ))}
      </View>

      {tournaments.length > 0 && (
        <>
          <Text style={cs.label}>Tournament (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
            <TouchableOpacity style={[cs.tChip, !form.tournamentId && cs.tChipActive]} onPress={() => setForm((p) => ({ ...p, tournamentId: '' }))}>
              <Text style={[cs.tChipText, !form.tournamentId && { color: Colors.cyan }]}>None</Text>
            </TouchableOpacity>
            {tournaments.map((t: Tournament) => (
              <TouchableOpacity key={t.id} style={[cs.tChip, form.tournamentId === t.id && cs.tChipActive]} onPress={() => setForm((p) => ({ ...p, tournamentId: t.id }))}>
                <Text style={[cs.tChipText, form.tournamentId === t.id && { color: Colors.cyan }]} numberOfLines={1}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Btn label="Create Team" variant="primary" onPress={submit} loading={creating} fullWidth />
    </BottomSheet>
  );
}

// ─── Add / Edit Player Sheet ──────────────────────────────────────────────────

function AddPlayerSheet({ visible, onClose, teamId, editingPlayer, onComplete }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState<{ name: string; role: PlayerRole; jerseyNo: string; battingStyle: 'right' | 'left'; bowlingStyle: string }>({
    name: '', role: 'batsman', jerseyNo: '', battingStyle: 'right', bowlingStyle: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingPlayer) {
      setForm({ name: editingPlayer.name, role: editingPlayer.role, jerseyNo: editingPlayer.jerseyNo?.toString() ?? '', battingStyle: editingPlayer.battingStyle ?? 'right', bowlingStyle: editingPlayer.bowlingStyle ?? '' });
    } else {
      setForm({ name: '', role: 'batsman', jerseyNo: '', battingStyle: 'right', bowlingStyle: '' });
    }
  }, [editingPlayer, visible]);

  const submit = async () => {
    if (!form.name.trim()) { toast('Enter player name'); return; }
    setSaving(true);
    try {
      const playerData: Omit<Player, 'id'> = {
        name: form.name.trim(),
        role: form.role,
        jerseyNo: form.jerseyNo ? parseInt(form.jerseyNo) : undefined,
        battingStyle: form.battingStyle,
        bowlingStyle: form.bowlingStyle.trim() || undefined,
      };
      if (editingPlayer) {
        await updatePlayer(teamId, { ...playerData, id: editingPlayer.id });
        onComplete('Player updated!');
      } else {
        await addPlayer(teamId, playerData);
        onComplete('Player added!');
      }
    } catch { toast('Error saving player'); }
    setSaving(false);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={editingPlayer ? '✏️ Edit Player' : '👤 Add Player'}>
      <FormField label="Full Name *" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="e.g. Muhammad Ali" autoCapitalize="words" />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <FormField label="Jersey No" value={form.jerseyNo} onChangeText={(v) => setForm((p) => ({ ...p, jerseyNo: v }))} keyboardType="number-pad" placeholder="7" style={{ flex: 1 }} />
        <View style={{ flex: 2 }}>
          <Text style={cs.label}>Batting</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['right', 'left'] as const).map((style) => (
              <TouchableOpacity key={style} style={[cs.optBtn, form.battingStyle === style && cs.optActive]} onPress={() => setForm((p) => ({ ...p, battingStyle: style }))}>
                <Text style={[cs.optText, form.battingStyle === style && { color: Colors.cyan }]}>{style === 'right' ? 'RHB' : 'LHB'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Text style={cs.label}>Player Role *</Text>
      <View style={cs.roleGrid}>
        {(['batsman', 'bowler', 'allrounder', 'wicketkeeper'] as PlayerRole[]).map((r) => (
          <TouchableOpacity key={r} style={[cs.roleBtn, form.role === r && cs.roleActive]} onPress={() => setForm((p) => ({ ...p, role: r }))}>
            <Text style={cs.roleIcon}>{ROLE_ICONS[r]}</Text>
            <Text style={[cs.roleText, form.role === r && { color: Colors.cyan }]}>{ROLE_LABELS[r]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FormField label="Bowling Style (optional)" value={form.bowlingStyle} onChangeText={(v) => setForm((p) => ({ ...p, bowlingStyle: v }))} placeholder="e.g. Fast, Off-spin, Leg-spin" />

      <Btn label={editingPlayer ? 'Update Player' : 'Add to Squad'} variant="primary" onPress={submit} loading={saving} fullWidth />
    </BottomSheet>
  );
}

const cs = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '700', color: Colors.cyan, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  optBtn: { flex: 1, padding: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)', alignItems: 'center' },
  optActive: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.12)' },
  optText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  colorDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  colorDotSelected: { transform: [{ scale: 1.15 }], shadowColor: '#fff', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  tChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)' },
  tChipActive: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.12)' },
  tChipText: { fontSize: 12, fontWeight: '600', color: Colors.muted },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  roleBtn: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.04)' },
  roleActive: { borderColor: Colors.cyan, backgroundColor: 'rgba(0,180,255,0.12)' },
  roleIcon: { fontSize: 18 },
  roleText: { fontSize: 12, fontWeight: '600', color: Colors.text },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.5 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.06)' },
  createBtnText: { fontSize: 12, fontWeight: '700', color: Colors.cyan },
  teamCard: { marginHorizontal: 12, marginBottom: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden', flexDirection: 'row', ...Shadow.card },
  teamAccent: { width: 5 },
  teamBody: { flex: 1, padding: 12 },
  teamTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  teamName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  teamCode: { fontSize: 11, color: Colors.muted, letterSpacing: 1 },
  teamRight: { alignItems: 'flex-end', gap: 5 },
  teamPlayerCount: { fontSize: 11, color: Colors.muted },
  roleRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  roleChip: { backgroundColor: 'rgba(0,180,255,0.06)', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  roleChipText: { fontSize: 10, color: Colors.muted },
  deleteBtn: { padding: 14, justifyContent: 'center', alignItems: 'center' },

  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.bg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 13, fontWeight: '700', color: Colors.cyan },
  subHeaderTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  addPlayerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,180,255,0.06)' },
  addPlayerBtnText: { fontSize: 11, fontWeight: '700', color: Colors.cyan },

  teamHero: { margin: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, overflow: 'hidden', borderTopWidth: 3 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  colorCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  colorCircleText: { fontSize: 14, fontWeight: '900', color: '#000' },
  heroName: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  heroCode: { fontSize: 11, color: Colors.muted, letterSpacing: 2 },
  heroStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border },
  heroStatItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  heroStatVal: { fontSize: 20, fontWeight: '900', color: Colors.cyan },
  heroStatLabel: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },

  playerCard: { marginHorizontal: 12, marginBottom: 6, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, flexDirection: 'row', alignItems: 'center' },
  playerCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  jerseyBox: { width: 38, height: 38, borderRadius: Radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,180,255,0.06)' },
  jerseyNum: { fontSize: 14, fontWeight: '900' },
  playerName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  playerMeta: { flexDirection: 'row', alignItems: 'center' },
  playerRoleIcon: { fontSize: 12, marginRight: 4 },
  playerRoleText: { fontSize: 11, color: Colors.muted },
  playerExtra: { fontSize: 10, color: Colors.muted + '80' },
  playerActions: { flexDirection: 'row', gap: 7 },
  editBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(0,180,255,0.1)', borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,71,87,0.08)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.25)', alignItems: 'center', justifyContent: 'center' },
});

