import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, Animated, SafeAreaView,
} from 'react-native';
import { useMatch } from '../../context/MatchContext';
import { subscribeCommentary } from '../../services/firebase';
import { EmptyState, Loader } from '../../components/UI';
import { Colors, Radius } from '../../constants/theme';
import { Commentary } from '../../types';

const EVENT_STYLE: Record<Commentary['eventType'], { text: string; bg: string; border: string; label: string }> = {
  dot: { text: Colors.muted, bg: 'rgba(20,30,50,0.9)', border: Colors.border, label: '·' },
  run: { text: Colors.cyan, bg: 'rgba(0,50,80,0.85)', border: 'rgba(0,212,255,0.35)', label: 'RUN' },
  four: { text: Colors.green, bg: 'rgba(0,120,60,0.9)', border: 'rgba(0,255,136,0.55)', label: 'FOUR' },
  six: { text: Colors.yellow, bg: 'rgba(100,70,0,0.9)', border: 'rgba(255,217,61,0.65)', label: 'SIX!' },
  wicket: { text: Colors.red, bg: 'rgba(120,0,0,0.9)', border: 'rgba(255,71,87,0.65)', label: 'OUT!' },
  wide: { text: Colors.muted, bg: 'rgba(40,50,70,0.85)', border: 'rgba(107,138,170,0.35)', label: 'WD' },
  noball: { text: Colors.yellow, bg: 'rgba(80,60,0,0.85)', border: 'rgba(255,217,61,0.3)', label: 'NB' },
  bye: { text: Colors.muted, bg: 'rgba(30,40,60,0.85)', border: Colors.border, label: 'BYE' },
  legbye: { text: Colors.muted, bg: 'rgba(30,40,60,0.85)', border: Colors.border, label: 'LB' },
  freehit: { text: Colors.yellow, bg: 'rgba(80,60,0,0.9)', border: 'rgba(255,217,61,0.65)', label: 'FREE!' },
};

export default function CommentaryScreen() {
  const { activeMatchId, activeMatch } = useMatch();
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!activeMatchId) { setIsLoading(false); return; }
    const unsub = subscribeCommentary(activeMatchId, (items) => {
      setCommentary(items);
      setIsLoading(false);
      slideAnim.setValue(-20);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }).start();
    });
    return unsub;
  }, [activeMatchId]);

  if (!activeMatchId || !activeMatch) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}><Text style={s.headerTitle}>COMMENTARY</Text></View>
        <EmptyState icon="🎙️" title="No Live Match" desc="Commentary appears here when a match is in progress." />
      </SafeAreaView>
    );
  }

  if (isLoading) return <Loader text="Loading commentary..." />;

  const inn1 = activeMatch.innings?.[0];
  const inn2 = activeMatch.innings?.[1];
  const currentInn = inn2 || inn1;

  const renderItem = ({ item, index }: { item: Commentary; index: number }) => {
    const isLatest = index === 0;
    const style = EVENT_STYLE[item.eventType] ?? EVENT_STYLE.dot;
    const isSpecial = ['four', 'six', 'wicket'].includes(item.eventType);

    return (
      <Animated.View style={[s.item, isLatest && { transform: [{ translateY: slideAnim }] }, isSpecial && s.itemSpecial]}>
        <View style={s.overCol}>
          <Text style={s.overText}>{item.overNo}.{item.ballNo}</Text>
        </View>

        <View style={[s.ball, { backgroundColor: style.bg, borderColor: style.border }]}>
          <Text style={[s.ballText, { color: style.text }]}>{style.label}</Text>
        </View>

        <View style={s.textCol}>
          {isLatest && (
            <View style={s.latestBadge}><Text style={s.latestText}>LATEST</Text></View>
          )}
          <Text style={[s.commText, isSpecial && s.commTextBold]}>{item.text}</Text>
          <Text style={s.bowlerStriker}>{item.bowlerName} → {item.strikerName}</Text>
        </View>

        {isSpecial && (
          <Text style={[s.bigEvent, { color: style.text }]}>
            {item.eventType === 'four' ? '4️⃣' : item.eventType === 'six' ? '6️⃣' : '❌'}
          </Text>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>COMMENTARY</Text>
        <Text style={s.headerSub}>{activeMatch.team1Code} vs {activeMatch.team2Code}</Text>
      </View>

      {/* Score Bar */}
      <View style={s.scoreBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.scoreBarMatch} numberOfLines={1}>{activeMatch.team1Name} vs {activeMatch.team2Name}</Text>
          {activeMatch.venue && <Text style={s.scoreBarVenue}>{activeMatch.venue}</Text>}
        </View>
        {currentInn && (
          <View style={s.scoreBarRight}>
            <Text style={s.scoreBarScore}>{currentInn.runs}/{currentInn.wickets}</Text>
            <Text style={s.scoreBarOvers}>({Math.floor(currentInn.balls / 6)}.{currentInn.balls % 6} ov)</Text>
          </View>
        )}
      </View>

      {inn1 && inn2 && (
        <View style={s.targetBar}>
          <Text style={s.targetBarText}>
            Target: <Text style={{ color: Colors.red, fontWeight: '700' }}>{inn1.runs + 1}</Text>
            {'  '}Need:{' '}
            <Text style={{ color: '#ff9aa2', fontWeight: '700' }}>{Math.max(0, inn1.runs + 1 - inn2.runs)}</Text>
          </Text>
        </View>
      )}

      {commentary.length === 0 ? (
        <EmptyState icon="🎙️" title="No commentary yet" desc="Ball-by-ball updates will appear as the match progresses." />
      ) : (
        <FlatList
          data={commentary}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListHeaderComponent={
            <View style={s.feedHeader}>
              <View style={s.liveDot} />
              <Text style={s.feedTitle}>LIVE BALL-BY-BALL</Text>
              <Text style={s.feedCount}>{commentary.length} deliveries</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.cyan, letterSpacing: 1.5 },
  headerSub: { fontSize: 10, color: Colors.muted, marginTop: 2 },

  scoreBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  scoreBarMatch: { fontSize: 14, fontWeight: '700', color: Colors.text },
  scoreBarVenue: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  scoreBarRight: { alignItems: 'flex-end' },
  scoreBarScore: { fontSize: 22, fontWeight: '800', color: Colors.cyan },
  scoreBarOvers: { fontSize: 10, color: Colors.muted },

  targetBar: { backgroundColor: 'rgba(255,71,87,0.08)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,71,87,0.18)', paddingVertical: 7, alignItems: 'center' },
  targetBarText: { fontSize: 12, color: 'rgba(232,244,255,0.7)' },

  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red },
  feedTitle: { flex: 1, fontSize: 10, fontWeight: '800', color: Colors.muted, letterSpacing: 1.4, textTransform: 'uppercase' },
  feedCount: { fontSize: 10, color: Colors.muted },

  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  itemSpecial: { backgroundColor: 'rgba(0,180,255,0.03)', borderRadius: Radius.md, paddingHorizontal: 4 },

  overCol: { minWidth: 32, paddingTop: 4, alignItems: 'center' },
  overText: { fontSize: 10, fontWeight: '700', color: Colors.muted },

  ball: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ballText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },

  textCol: { flex: 1 },
  latestBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,180,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,180,255,0.3)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, marginBottom: 4 },
  latestText: { fontSize: 8, color: Colors.cyan, fontWeight: '800', letterSpacing: 0.8 },
  commText: { fontSize: 13, color: 'rgba(232,244,255,0.85)', lineHeight: 19 },
  commTextBold: { fontWeight: '700', color: Colors.text },
  bowlerStriker: { fontSize: 10, color: Colors.muted, marginTop: 3 },

  bigEvent: { fontSize: 22, alignSelf: 'center' },
  separator: { height: 1, backgroundColor: 'rgba(0,180,255,0.06)' },
});
