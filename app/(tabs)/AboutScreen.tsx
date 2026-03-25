import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, SafeAreaView } from 'react-native';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';

const APP_VERSION = '1.0.0';
const BUILD_YEAR = '2026';

const FEATURES = [
  { icon: '⚡', label: 'Ball-by-Ball Scoring', desc: 'Real-time delivery-by-delivery tracking' },
  { icon: '🏆', label: 'Tournament Management', desc: 'Knockout, league, and hybrid formats' },
  { icon: '👥', label: 'Team & Player Squads', desc: 'Build and manage full rosters' },
  { icon: '📊', label: 'Live Statistics', desc: 'Batting, bowling, NRR, partnerships' },
  { icon: '💬', label: 'Live Commentary', desc: 'Auto-generated ball-by-ball commentary' },
  { icon: '🎾', label: 'Tapeball & Leather Modes', desc: 'Full Pakistan tapeball & international support' },
  { icon: '⚙️', label: 'Powerplay Controls', desc: 'Toggle powerplay with visual indicator' },
  { icon: '↩️', label: 'Undo Last Ball', desc: 'Correct scoring mistakes instantly' },
  { icon: '🔗', label: 'Real-Time Sync', desc: 'Live data across all connected devices' },
];

export default function AboutScreen() {
  const openEmail = () => {
    Linking.openURL('mailto:asifnawazlashari7@gmail.com').catch(() => {});
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>ABOUT</Text>
      </View>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>🏏</Text>
          <Text style={s.heroTitle}>Cricket A7</Text>
          <Text style={s.heroSub}>Live Score & Match Management</Text>
          <View style={s.versionBadge}>
            <Text style={s.versionText}>v{APP_VERSION} · {BUILD_YEAR}</Text>
          </View>
        </View>

        {/* Developer Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderTitle}>DEVELOPERS</Text>
          </View>
          <View style={s.cardBody}>
            <View style={s.devRow}>
              <View style={s.devAvatar}>
                <Text style={s.devAvatarText}>AN</Text>
              </View>
              <View style={s.devInfo}>
                <Text style={s.devName}>Asif Nawaz Lashari</Text>
                <Text style={s.devStudio}>A7 Studio · Lead Developer</Text>
                <TouchableOpacity onPress={openEmail}>
                  <Text style={s.devEmail}>asifnawazlashari7@gmail.com</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Tech Note */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderTitle}>TECHNOLOGY</Text>
          </View>
          <View style={s.cardBody}>
            <Text style={s.techNote}>
              Built with modern real-time database technology, enabling live score sync across all connected devices simultaneously. Designed for local cricket communities across Pakistan.
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderTitle}>FEATURES</Text>
          </View>
          <View style={s.cardBody}>
            {FEATURES.map((f, i) => (
              <View key={f.label} style={[s.featureRow, i < FEATURES.length - 1 && s.featureRowBorder]}>
                <Text style={s.featureIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureLabel}>{f.label}</Text>
                  <Text style={s.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Cricket Rules */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderTitle}>TAPEBALL RULES (PAKISTAN)</Text>
          </View>
          <View style={s.cardBody}>
            {[
              'Tennis ball wrapped in electrical tape (tapeball)',
              'Formats: T6, T8, T10 — common in local Pakistan cricket',
              'Leg byes typically NOT counted in tapeball cricket',
              'Wide = +1 run + re-bowl | No-ball = +1 run + Free Hit',
              'Bouncer limit: 1 per over in most tapeball formats',
              'All standard dismissals apply',
              'Powerplay: optional — depends on tournament rules',
            ].map((rule, i) => (
              <View key={i} style={s.ruleRow}>
                <View style={s.ruleDot} />
                <Text style={s.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.footer}>Cricket A7 · A7 Studio · {BUILD_YEAR}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.5 },
  container: { flex: 1, backgroundColor: Colors.bg },
  hero: {
    alignItems: 'center', paddingVertical: 36,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: 'rgba(0,180,255,0.03)',
  },
  heroEmoji: { fontSize: 52, marginBottom: 10 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: Colors.cyan, letterSpacing: 2 },
  heroSub: { fontSize: 12, color: Colors.muted, marginTop: 4, letterSpacing: 0.5 },
  versionBadge: {
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: 'rgba(0,180,255,0.06)',
  },
  versionText: { fontSize: 11, color: Colors.muted, letterSpacing: 0.8 },
  card: {
    marginHorizontal: 12, marginTop: 16,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.card,
  },
  cardHeader: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(0,180,255,0.04)', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cardHeaderTitle: {
    fontSize: 11, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  cardBody: { padding: 14 },
  devRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  devAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,180,255,0.12)',
    borderWidth: 2, borderColor: Colors.cyan,
    alignItems: 'center', justifyContent: 'center',
  },
  devAvatarText: { fontSize: 18, fontWeight: '800', color: Colors.cyan },
  devInfo: { flex: 1 },
  devName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  devStudio: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  devEmail: { fontSize: 11, color: Colors.cyan, marginTop: 4 },
  techNote: { fontSize: 13, color: Colors.text2, lineHeight: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,180,255,0.06)' },
  featureIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  featureLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  featureDesc: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5 },
  ruleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.cyan, marginTop: 5 },
  ruleText: { flex: 1, fontSize: 12, color: Colors.text2, lineHeight: 18 },
  footer: { textAlign: 'center', fontSize: 11, color: Colors.muted, marginTop: 28, marginBottom: 16, letterSpacing: 0.5 },
});
