import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { usePalette } from './palette';

/** Shared A1 primitives: 44 pt targets, system type, theme-aware colors. */

export type IconName =
  | 'chevron-down' | 'chevron-right' | 'chevron-left' | 'gear' | 'live' | 'clock' | 'pushpin' | 'pin' | 'globe'
  | 'bell' | 'bookmark' | 'bookmark-fill' | 'people' | 'book' | 'quiz' | 'exam' | 'event' | 'homework' | 'fit' | 'plus' | 'minus' | 'external' | 'refresh' | 'lock';

export function Icon({ name, size = 18, color }: { name: IconName; size?: number; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  let body: ReactNode;
  switch (name) {
    case 'chevron-down': body = <Path d="M6 9l6 6 6-6" {...stroke} />; break;
    case 'chevron-right': body = <Path d="M9 6l6 6-6 6" {...stroke} />; break;
    case 'chevron-left': body = <Path d="M15 6l-6 6 6 6" {...stroke} />; break;
    case 'gear': body = <><Circle cx={12} cy={12} r={3.2} {...stroke} /><Path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9" {...stroke} /></>; break;
    case 'live': body = <Circle cx={12} cy={12} r={5} fill={color} />; break;
    case 'clock': body = <><Circle cx={12} cy={12} r={8.5} {...stroke} /><Path d="M12 7.5V12l3 2" {...stroke} /></>; break;
    case 'pushpin': body = <Path d="M9 4h6l-1 5 3 4v2H7v-2l3-4-1-5zm3 11v6" {...stroke} />; break;
    case 'pin': body = <><Path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z" {...stroke} /><Circle cx={12} cy={10} r={2.3} {...stroke} /></>; break;
    case 'globe': body = <><Circle cx={12} cy={12} r={8.5} {...stroke} /><Path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" {...stroke} /></>; break;
    case 'people': body = <><Circle cx={9} cy={8.5} r={3.2} {...stroke} /><Path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M15.5 5.6a3 3 0 010 5.8M17.5 14.3c1.7.6 2.8 2.2 3.1 4.7" {...stroke} /></>; break;
    case 'book': body = <Path d="M5 4.5h10.5a3 3 0 013 3V20H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10.5" {...stroke} />; break;
    case 'quiz': body = <><Circle cx={12} cy={12} r={8.5} {...stroke} /><Path d="M9.6 9.6a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.2M12 16.8v.1" {...stroke} /></>; break;
    case 'exam': body = <><Rect x={5} y={3.5} width={14} height={17} rx={2} {...stroke} /><Path d="M8.5 8h7M8.5 12h7M8.5 16h4" {...stroke} /></>; break;
    case 'event': body = <><Rect x={4} y={5} width={16} height={15} rx={2} {...stroke} /><Path d="M4 10h16M8.5 3v4M15.5 3v4" {...stroke} /></>; break;
    case 'homework': body = <Path d="M14.5 4.5l5 5L9 20H4v-5zM12.5 6.5l5 5" {...stroke} />; break;
    case 'fit': body = <Path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" {...stroke} />; break;
    case 'bell': body = <Path d="M5 17h14l-2-3V9a5 5 0 00-10 0v5l-2 3zm5 3h4" {...stroke} />; break;
    case 'bookmark': case 'bookmark-fill': body = <Path d="M6 4h12v16l-6-4-6 4z" {...stroke} fill={name === 'bookmark-fill' ? color : 'none'} />; break;
    case 'plus': body = <Path d="M12 5v14M5 12h14" {...stroke} />; break;
    case 'minus': body = <Path d="M5 12h14" {...stroke} />; break;
    case 'external': body = <Path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" {...stroke} />; break;
    case 'refresh': body = <Path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4.5v4h-4" {...stroke} />; break;
    case 'lock': body = <><Rect x={5} y={10.5} width={14} height={10} rx={2} {...stroke} /><Path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" {...stroke} /></>; break;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24" pointerEvents="none">{body}</Svg>;
}

type ButtonTone = 'primary' | 'secondary' | 'plain' | 'danger';

export function Button({ label, onPress, tone = 'secondary', icon, disabled, busy, accessibilityLabel, accessibilityHint, compact, style, testID }: {
  label: string; onPress: () => void; tone?: ButtonTone; icon?: IconName; disabled?: boolean; busy?: boolean;
  accessibilityLabel?: string; accessibilityHint?: string; compact?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const palette = usePalette();
  const background = tone === 'primary' ? palette.accent : tone === 'danger' ? palette.liveSoft : tone === 'secondary' ? palette.accentSoft : 'transparent';
  const color = tone === 'primary' ? palette.accentText : tone === 'danger' ? palette.live : palette.accent;
  const inactive = disabled || busy;
  return <Pressable
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityHint={accessibilityHint}
    aria-disabled={!!inactive} aria-busy={!!busy}
    disabled={inactive}
    onPress={onPress}
    hitSlop={compact ? 4 : 0}
    style={({ pressed }) => [styles.button, compact && styles.buttonCompact, { backgroundColor: background, opacity: inactive ? 0.5 : pressed ? 0.7 : 1 }, style]}>
    {busy ? <ActivityIndicator size="small" color={color} /> : icon ? <Icon name={icon} size={16} color={color} /> : null}
    <Text style={[styles.buttonText, { color }]} numberOfLines={1}>{label}</Text>
  </Pressable>;
}

/** Icon-only control with an accessible name and a 44 pt target. */
export function IconButton({ icon, label, onPress, disabled, selected, dot }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; selected?: boolean; dot?: boolean }) {
  const palette = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} aria-disabled={!!disabled} aria-selected={selected} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1, backgroundColor: selected ? palette.accentSoft : 'transparent' }]}>
    <Icon name={icon} size={20} color={palette.accent} />
    {dot && <View pointerEvents="none" style={{ position: 'absolute', right: 10, top: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.live }} />}
  </Pressable>;
}

/** Prominent filled switch (Social / Work). */
export function FilledSwitch<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  const palette = usePalette();
  return <View accessibilityRole="tablist" accessibilityLabel={label} style={[styles.filled, { backgroundColor: palette.backgroundElement }]}>
    {options.map(option => {
      const selected = option.value === value;
      return <Pressable key={option.value} accessibilityRole="tab" aria-selected={selected} accessibilityLabel={option.label}
        onPress={() => onChange(option.value)} style={[styles.filledOption, selected && { backgroundColor: palette.accent }]}>
        <Text style={[styles.filledText, { color: selected ? palette.accentText : palette.text }]}>{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}

/** Quieter compact outlined toggle (List / Graph, Upcoming / Past). Visually distinct from FilledSwitch and underline tabs. */
export function CompactToggle<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; accessibilityLabel?: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  const palette = usePalette();
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.compact, { borderColor: palette.border }]}>
    {options.map(option => {
      const selected = option.value === value;
      return <Pressable key={option.value} accessibilityRole="radio" aria-checked={selected} accessibilityLabel={option.accessibilityLabel ?? option.label}
        onPress={() => onChange(option.value)} hitSlop={{ top: 6, bottom: 6 }}
        style={[styles.compactOption, selected && { backgroundColor: palette.backgroundSelected }]}>
        <Text style={[styles.compactText, { color: selected ? palette.text : palette.textSecondary, fontWeight: selected ? '700' : '500' }]}>{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}

/** Small filter chip with selected state. */
export function FilterChip({ label, selected, onPress, accessibilityLabel }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string }) {
  const palette = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} aria-selected={selected} onPress={onPress}
    style={[styles.chip, { borderColor: selected ? palette.accent : palette.border, backgroundColor: selected ? palette.accentSoft : 'transparent' }]}>
    <Text style={[styles.chipText, { color: selected ? palette.accent : palette.textSecondary }]}>{label}</Text>
  </Pressable>;
}

export function Tag({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'live' | 'accent' | 'warning' | 'success'; icon?: IconName }) {
  const palette = usePalette();
  const map = {
    neutral: [palette.backgroundElement, palette.textSecondary],
    live: [palette.liveSoft, palette.live],
    accent: [palette.accentSoft, palette.accent],
    warning: [palette.warningSoft, palette.warning],
    success: [palette.successSoft, palette.success],
  } as const;
  const [background, color] = map[tone];
  return <View style={[styles.tag, { backgroundColor: background }]}>
    {icon && <Icon name={icon} size={11} color={color} />}
    <Text style={[styles.tagText, { color }]}>{label}</Text>
  </View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }, style]}>{children}</View>;
}

export function Banner({ title, body, tone = 'neutral', action }: { title: string; body?: string; tone?: 'neutral' | 'warning' | 'live' | 'accent'; action?: ReactNode }) {
  const palette = usePalette();
  const background = tone === 'warning' ? palette.warningSoft : tone === 'live' ? palette.liveSoft : tone === 'accent' ? palette.accentSoft : palette.backgroundElement;
  const color = tone === 'warning' ? palette.warning : tone === 'live' ? palette.live : tone === 'accent' ? palette.accent : palette.text;
  return <View accessible={!action} accessibilityRole={tone === 'live' || tone === 'warning' ? 'alert' : 'summary'} style={[styles.banner, { backgroundColor: background }]}>
    <View style={styles.bannerBody}>
      <Text style={[styles.bannerTitle, { color }]}>{title}</Text>
      {body ? <Text style={[styles.bannerText, { color: palette.text }]}>{body}</Text> : null}
    </View>
    {action}
  </View>;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  const palette = usePalette();
  return <View style={styles.empty}>
    <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
    {body && <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>{body}</Text>}
    {action}
  </View>;
}

export function Txt({ children, tone = 'primary', variant = 'body', numberOfLines, style }: {
  children: ReactNode; tone?: 'primary' | 'secondary' | 'accent' | 'live'; variant?: 'title' | 'heading' | 'body' | 'small' | 'caption'; numberOfLines?: number; style?: StyleProp<import('react-native').TextStyle>;
}) {
  const palette = usePalette();
  const color = tone === 'secondary' ? palette.textSecondary : tone === 'accent' ? palette.accent : tone === 'live' ? palette.live : palette.text;
  return <Text numberOfLines={numberOfLines} style={[styles[variant], { color }, style]}>{children}</Text>;
}


const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  buttonCompact: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  filled: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  filledOption: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  filledText: { fontSize: 16, fontWeight: '700' },
  compact: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, padding: 2, alignSelf: 'flex-start' },
  compactOption: { minHeight: 32, minWidth: 64, paddingHorizontal: 10, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  compactText: { fontSize: 13 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  tagText: { fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  banner: { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerBody: { flex: 1, gap: 2 },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerText: { fontSize: 14, lineHeight: 19 },
  empty: { paddingVertical: 14, gap: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptyBody: { fontSize: 14, lineHeight: 19 },
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heading: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 20 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
});
