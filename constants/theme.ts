import { StyleSheet } from 'react-native';

export const Colors = {
  bg: '#04080f',
  bg2: '#07111f',
  panel: '#0b1a2e',
  panel2: '#0e2040',
  card: '#081425',
  border: 'rgba(0,180,255,0.15)',
  border2: 'rgba(0,180,255,0.08)',
  cyan: '#00d4ff',
  cyan2: '#00a8cc',
  green: '#00ff88',
  yellow: '#ffd93d',
  red: '#ff4757',
  text: '#e8f4ff',
  text2: 'rgba(232,244,255,0.85)',
  muted: '#6b8aaa',
  overlay: 'rgba(0,0,0,0.75)',
};

export const Fonts = {
  heading: 'Rajdhani-Bold',
  headingMedium: 'Rajdhani-SemiBold',
  headingRegular: 'Rajdhani-Regular',
  condensed: 'BarlowCondensed-SemiBold',
  condensedRegular: 'BarlowCondensed-Regular',
  body: 'Barlow-Regular',
  bodyMedium: 'Barlow-Medium',
  bodySemiBold: 'Barlow-SemiBold',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 20,
  full: 9999,
};

export const Shadow = {
  glow: {
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glowSm: {
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const RoleColors: Record<string, string> = {
  developer: '#ff4757',
  organizer: '#ffd93d',
  captain: '#00ff88',
  viewer: '#6b8aaa',
};

export const BallColors = {
  dot: { bg: 'rgba(20,30,50,0.9)', border: Colors.border, text: Colors.muted },
  one: { bg: 'rgba(0,50,80,0.85)', border: 'rgba(0,212,255,0.35)', text: Colors.cyan },
  two: { bg: 'rgba(0,50,80,0.85)', border: 'rgba(0,212,255,0.35)', text: Colors.cyan },
  three: { bg: 'rgba(0,50,80,0.85)', border: 'rgba(0,212,255,0.35)', text: Colors.cyan },
  four: { bg: 'rgba(0,120,60,0.9)', border: 'rgba(0,255,136,0.55)', text: Colors.green },
  six: { bg: 'rgba(100,70,0,0.9)', border: 'rgba(255,217,61,0.65)', text: Colors.yellow },
  wide: { bg: 'rgba(40,50,70,0.85)', border: 'rgba(107,138,170,0.35)', text: Colors.muted },
  noball: { bg: 'rgba(40,50,70,0.85)', border: 'rgba(107,138,170,0.35)', text: Colors.muted },
  wicket: { bg: 'rgba(120,0,0,0.9)', border: 'rgba(255,71,87,0.65)', text: Colors.red },
};

export const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 10,
    ...Shadow.card,
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,180,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.cyan,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardBody: {
    padding: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  badgeGreen: {
    backgroundColor: 'rgba(0,168,96,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,168,96,0.4)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeRed: {
    backgroundColor: 'rgba(255,71,87,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.4)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeCyan: {
    backgroundColor: 'rgba(0,180,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,180,255,0.35)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  input: {
    backgroundColor: 'rgba(0,180,255,0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(0,180,255,0.8)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.muted,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
