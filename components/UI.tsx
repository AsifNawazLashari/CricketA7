import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadow, Spacing } from '../constants/theme';

// ─── Button ───────────────────────────────────────────────────────────────────

interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'gold' | 'red' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Btn({
  label, onPress, variant = 'primary', size = 'md',
  disabled, loading, style, textStyle, icon, fullWidth,
}: BtnProps) {
  const isGradient = variant === 'primary' || variant === 'gold' || variant === 'red';

  const padV = size === 'sm' ? 7 : size === 'lg' ? 14 : 10;
  const padH = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const fSize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;

  const gradientColors: Record<string, [string, string]> = {
    primary: ['#0080cc', '#0060aa'],
    gold: ['#ffd93d', '#cc9900'],
    red: ['#ff4757', '#cc2233'],
  };

  const content = (
    <View style={[btnS.inner, { paddingVertical: padV, paddingHorizontal: padH }]}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'gold' ? '#07111f' : '#fff'} />
      ) : (
        <>
          {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
          <Text style={[
            btnS.label,
            { fontSize: fSize },
            variant === 'gold' && { color: '#07111f' },
            variant === 'outline' && { color: Colors.text },
            variant === 'ghost' && { color: Colors.muted },
            disabled && { opacity: 0.5 },
            textStyle,
          ]}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.78}
      style={[fullWidth && { width: '100%' }, style]}
    >
      {isGradient ? (
        <LinearGradient
          colors={gradientColors[variant]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[btnS.base, btnS.gradient, disabled && { opacity: 0.5 }]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[
          btnS.base,
          variant === 'outline' && btnS.outline,
          variant === 'ghost' && btnS.ghost,
          disabled && { opacity: 0.5 },
        ]}>
          {content}
        </View>
      )}
    </TouchableOpacity>
  );
}

const btnS = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  gradient: {},
  outline: {
    backgroundColor: 'rgba(0,180,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,180,255,0.2)',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  header?: ReactNode;
  glow?: boolean;
}

export function Card({ children, style, header, glow }: CardProps) {
  return (
    <View style={[cardS.card, glow && Shadow.glow, style]}>
      {header && <View style={cardS.header}>{header}</View>}
      {children}
    </View>
  );
}

const cardS = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: 10,
    ...Shadow.card,
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,180,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
});

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color?: 'cyan' | 'green' | 'red' | 'yellow' | 'grey';
  size?: 'sm' | 'md';
  dot?: boolean;
  animate?: boolean;
}

export function Badge({ label, color = 'cyan', size = 'sm', dot, animate }: BadgeProps) {
  const colors = {
    cyan: { bg: 'rgba(0,180,255,0.12)', border: 'rgba(0,180,255,0.35)', text: Colors.cyan, dot: Colors.cyan },
    green: { bg: 'rgba(0,168,96,0.15)', border: 'rgba(0,168,96,0.4)', text: Colors.green, dot: Colors.green },
    red: { bg: 'rgba(255,71,87,0.15)', border: 'rgba(255,71,87,0.4)', text: Colors.red, dot: Colors.red },
    yellow: { bg: 'rgba(255,217,61,0.12)', border: 'rgba(255,217,61,0.35)', text: Colors.yellow, dot: Colors.yellow },
    grey: { bg: 'rgba(107,138,170,0.1)', border: 'rgba(107,138,170,0.2)', text: Colors.muted, dot: Colors.muted },
  }[color];

  return (
    <View style={[
      badgeS.base,
      { backgroundColor: colors.bg, borderColor: colors.border },
      size === 'md' && { paddingHorizontal: 12, paddingVertical: 4 },
    ]}>
      {dot && (
        <View style={[badgeS.dot, { backgroundColor: colors.dot }]} />
      )}
      <Text style={[badgeS.text, { color: colors.text }, size === 'md' && { fontSize: 11 }]}>
        {label}
      </Text>
    </View>
  );
}

const badgeS = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});

// ─── SectionTitle ─────────────────────────────────────────────────────────────

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={stS.row}>
      <View style={stS.bar} />
      <Text style={stS.text}>{title}</Text>
      {right && <View style={{ marginLeft: 'auto' }}>{right}</View>}
    </View>
  );
}

const stS = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 8,
  },
  bar: {
    width: 3,
    height: 12,
    backgroundColor: Colors.cyan,
    borderRadius: 2,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, desc, action }: {
  icon: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <View style={emS.wrap}>
      <Text style={emS.icon}>{icon}</Text>
      <Text style={emS.title}>{title}</Text>
      {desc && <Text style={emS.desc}>{desc}</Text>}
      {action && <View style={{ marginTop: 16 }}>{action}</View>}
    </View>
  );
}

const emS = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  icon: { fontSize: 48, marginBottom: 12, opacity: 0.35 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.muted, marginBottom: 6 },
  desc: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
});

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: Colors.border }, style]} />;
}

// ─── FormField ────────────────────────────────────────────────────────────────

import { TextInput, TextInputProps, KeyboardTypeOptions } from 'react-native';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  editable?: boolean;
}

export function FormField({ label, style, ...rest }: FieldProps) {
  return (
    <View style={[fieldS.wrap, style]}>
      <Text style={fieldS.label}>{label}</Text>
      <TextInput
        {...rest}
        style={[fieldS.input, rest.multiline && { height: 80, textAlignVertical: 'top' }]}
        placeholderTextColor={Colors.muted}
        selectionColor={Colors.cyan}
      />
    </View>
  );
}

const fieldS = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(0,180,255,0.8)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 5,
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
});

// ─── Loader ───────────────────────────────────────────────────────────────────

export function Loader({ text }: { text?: string }) {
  return (
    <View style={loaderS.wrap}>
      <ActivityIndicator color={Colors.cyan} size="large" />
      {text && <Text style={loaderS.text}>{text}</Text>}
    </View>
  );
}

const loaderS = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  text: { marginTop: 10, color: Colors.muted, fontSize: 13, letterSpacing: 0.5 },
});

// ─── SegmentControl ───────────────────────────────────────────────────────────

export function SegmentControl({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={segS.wrap}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[segS.item, value === o.value && segS.active]}
          activeOpacity={0.75}
        >
          <Text style={[segS.label, value === o.value && segS.activeLabel]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const segS = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderColor: 'transparent',
    marginBottom: -1,
  },
  active: { borderColor: Colors.cyan },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  activeLabel: { color: Colors.cyan },
});
