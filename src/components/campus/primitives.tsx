import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityRole,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { SectionToggle } from './SectionToggle';
import { initialsOf } from './format';
import { usePalette, type CampusPalette } from './palette';
import { ScreenSky } from './ScreenSky';

export const MIN_TOUCH = 44;

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'live';

function toneColors(palette: CampusPalette, tone: Tone) {
  switch (tone) {
    case 'accent': return { fg: palette.accent, bg: palette.accentSoft };
    case 'success': return { fg: palette.success, bg: palette.successSoft };
    case 'warning': return { fg: palette.warning, bg: palette.warningSoft };
    case 'danger': return { fg: palette.danger, bg: palette.dangerSoft };
    case 'live': return { fg: palette.live, bg: palette.dangerSoft };
    default: return { fg: palette.textSecondary, bg: palette.backgroundElement };
  }
}

/* ---------- Layout ---------- */

export function Screen({ title, children, footer, headerRight, scroll = true }: {
  title?: string; children: ReactNode; footer?: ReactNode; headerRight?: () => ReactNode; scroll?: boolean;
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const body = <View style={styles.inner}>{children}</View>;
  return (
    <View style={[styles.page, { backgroundColor: palette.background }]}>
      <ScreenSky />
      {title !== undefined && <Stack.Screen options={{ title, headerRight }} />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Spacing.five + (footer ? 0 : insets.bottom) }]}
          contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{body}</View>
      )}
      {footer && (
        <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background, paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
          <View style={styles.inner}>{footer}</View>
        </View>
      )}
    </View>
  );
}

export function Section({ title, action, children, count, collapse }: {
  title: string; action?: ReactNode; children: ReactNode; count?: number;
  collapse?: { expanded: boolean; onToggle: () => void };
}) {
  const palette = usePalette();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {collapse ? <SectionToggle label={title} expanded={collapse.expanded} onPress={collapse.onToggle}
          style={styles.sectionToggle} color={palette.textSecondary}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}{count !== undefined && <Text style={{ color: palette.textSecondary }}>{`  ${count}`}</Text>}</Text>
        </SectionToggle> : <Text accessibilityRole="header" aria-level={2} style={[styles.sectionTitle, { color: palette.text }]}>
          {title}{count !== undefined ? <Text style={{ color: palette.textSecondary }}>{`  ${count}`}</Text> : null}
        </Text>}
        {action}
      </View>
      {collapse?.expanded !== false && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

export function Card({ children, onPress, accessibilityLabel, accessibilityHint, style }: {
  children: ReactNode; onPress?: () => void; accessibilityLabel?: string; accessibilityHint?: string; style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const base = [styles.card, { backgroundColor: palette.backgroundElement }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { backgroundColor: palette.backgroundSelected }]}>
      {children}
    </Pressable>
  );
}

export function Row({ children, gap = Spacing.two, wrap, style }: { children: ReactNode; gap?: number; wrap?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, { gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

/* ---------- Text ---------- */

export function Title({ children }: { children: ReactNode }) {
  const palette = usePalette();
  return <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{children}</Text>;
}

export function Body({ children, secondary, small, bold, numberOfLines, style }: {
  children: ReactNode; secondary?: boolean; small?: boolean; bold?: boolean; numberOfLines?: number; style?: StyleProp<any>;
}) {
  const palette = usePalette();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[small ? styles.small : styles.body, bold && styles.bold, { color: secondary ? palette.textSecondary : palette.text }, style]}>
      {children}
    </Text>
  );
}

/* ---------- Controls ---------- */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({ label, onPress, variant = 'primary', disabled, accessibilityHint, accessibilityLabel, compact, flex }: {
  label: string; onPress: () => void; variant?: ButtonVariant; disabled?: boolean;
  accessibilityHint?: string; accessibilityLabel?: string; compact?: boolean; flex?: boolean;
}) {
  const palette = usePalette();
  const colors = {
    primary: { bg: palette.accent, fg: palette.onAccent, border: palette.accent },
    secondary: { bg: palette.accentSoft, fg: palette.accent, border: palette.accentSoft },
    danger: { bg: palette.dangerSoft, fg: palette.danger, border: palette.dangerSoft },
    ghost: { bg: 'transparent', fg: palette.accent, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      aria-disabled={!!disabled}
      disabled={disabled}
      onPress={onPress}
      hitSlop={compact ? 4 : 0}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        flex && styles.fill,
        { backgroundColor: colors.bg, borderColor: colors.border, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}>
      <Text style={[styles.buttonLabel, { color: colors.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label, value, onChangeText, error, hint, placeholder, multiline, keyboardType, maxLength, autoCapitalize, onSubmitEditing, testID,
}: {
  label: string; value: string; onChangeText: (text: string) => void; error?: string; hint?: string; placeholder?: string;
  multiline?: boolean; keyboardType?: KeyboardTypeOptions; maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; onSubmitEditing?: () => void; testID?: string;
}) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: palette.text }]}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textSecondary}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        onSubmitEditing={onSubmitEditing}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: palette.text, backgroundColor: palette.backgroundElement, borderColor: error ? palette.danger : palette.border },
        ]}
      />
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.small, { color: palette.danger }]}>{error}</Text>
        : hint ? <Text style={[styles.small, { color: palette.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

export interface ChoiceOption<T extends string> { value: T; label: string; accessibilityLabel?: string }

/** Single-select chips (wrapping). Exposes radio semantics and checked state. */
export function Choices<T extends string>({ label, options, value, onChange, error }: {
  label?: string; options: ChoiceOption<T>[]; value: T | undefined; onChange: (value: T) => void; error?: string;
}) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      {label && <Text style={[styles.fieldLabel, { color: palette.text }]}>{label}</Text>}
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.row, styles.wrap, { gap: Spacing.two }]}>
        {options.map(option => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.accessibilityLabel ?? option.label}
              accessibilityState={{ checked: selected, selected }}
              aria-checked={selected}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected ? palette.accent : palette.backgroundElement,
                  borderColor: selected ? palette.accent : palette.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Text style={[styles.chipLabel, { color: selected ? palette.onAccent : palette.text }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text accessibilityLiveRegion="polite" style={[styles.small, { color: palette.danger }]}>{error}</Text>}
    </View>
  );
}

/** Filled segmented control for switching modes (e.g. create kind). */
export function Segmented<T extends string>({ label, options, value, onChange }: {
  label: string; options: ChoiceOption<T>[]; value: T; onChange: (value: T) => void;
}) {
  const palette = usePalette();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={[styles.segmented, { backgroundColor: palette.backgroundElement }]}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: palette.accent }]}>
            <Text style={[styles.chipLabel, { color: selected ? palette.onAccent : palette.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Status ---------- */

export function Badge({ label, tone = 'neutral', accessibilityLabel }: { label: string; tone?: Tone; accessibilityLabel?: string }) {
  const palette = usePalette();
  const { fg, bg } = toneColors(palette, tone);
  return (
    <View accessible accessibilityLabel={accessibilityLabel ?? label} style={[styles.badge, { backgroundColor: bg }]}>
      {tone === 'live' && <View style={[styles.liveDot, { backgroundColor: fg }]} />}
      <Text style={[styles.badgeLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, initials, size = 40, dashed }: { name: string; initials?: string; size?: number; dashed?: boolean }) {
  const palette = usePalette();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: dashed ? 'transparent' : palette.accentSoft,
        borderWidth: dashed ? 1.5 : 0, borderStyle: dashed ? 'dashed' : 'solid', borderColor: palette.accent,
      }}>
      <Text maxFontSizeMultiplier={1.2} style={{ color: palette.accent, fontWeight: '700', fontSize: size * 0.38 }}>{initialsOf(name, initials)}</Text>
    </View>
  );
}

export function Notice({ children, tone = 'warning' }: { children: ReactNode; tone?: Tone }) {
  const palette = usePalette();
  const { fg, bg } = toneColors(palette, tone);
  return (
    <View accessibilityRole={'text' as AccessibilityRole} style={[styles.notice, { backgroundColor: bg }]}>
      <Text style={[styles.small, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const palette = usePalette();
  return (
    <View style={[styles.empty, { borderColor: palette.border }]}>
      <Text style={[styles.body, styles.bold, { color: palette.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[styles.small, { color: palette.textSecondary, textAlign: 'center' }]}>{body}</Text>
      {action}
    </View>
  );
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Notice tone="danger">{message}</Notice>;
}

/** Tappable list row with optional leading/trailing slots. */
export function ListRow({ title, subtitle, meta, leading, trailing, onPress, accessibilityLabel, accessibilityHint, selected }: {
  title: string; subtitle?: string; meta?: string; leading?: ReactNode; trailing?: ReactNode;
  onPress?: () => void; accessibilityLabel?: string; accessibilityHint?: string; selected?: boolean;
}) {
  const palette = usePalette();
  const content = (
    <>
      {leading}
      <View style={styles.fill}>
        <Text style={[styles.body, styles.bold, { color: palette.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.small, { color: palette.textSecondary }]}>{subtitle}</Text> : null}
        {meta ? <Text style={[styles.small, { color: palette.textSecondary }]}>{meta}</Text> : null}
      </View>
      {trailing}
    </>
  );
  const base = [styles.listRow, { backgroundColor: palette.backgroundElement }];
  if (!onPress) return <View style={base}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [...base, pressed && { backgroundColor: palette.backgroundSelected }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: Spacing.three, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  fill: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, alignItems: 'center' },
  section: { gap: Spacing.two },
  sectionToggle: { flex: 1, minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, minHeight: MIN_TOUCH },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', flexShrink: 1 },
  sectionBody: { gap: Spacing.two },
  card: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '600' },
  button: {
    minHeight: MIN_TOUCH, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  buttonCompact: { paddingHorizontal: Spacing.three - 4 },
  buttonLabel: { fontSize: 16, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  field: { gap: Spacing.one + 2 },
  fieldLabel: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  input: { minHeight: MIN_TOUCH, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  chip: { minHeight: MIN_TOUCH, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' },
  chipLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: MIN_TOUCH, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  notice: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: Spacing.four, gap: Spacing.two, alignItems: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: 12, minHeight: 60 },
});
