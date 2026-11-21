import { StyleSheet, View } from 'react-native';
import { Banner, Card, Tag, Txt } from './ui';

/** Clearly labeled preview. There is no campus social network behind it. */
const SAMPLE_HANGOUTS = [
  { id: 'sample-hangout-1', title: 'Sunset frisbee on the lawn', when: 'Sample · Friday evening', place: 'Fictional quad' },
  { id: 'sample-hangout-2', title: 'Board game night', when: 'Sample · Saturday', place: 'Fictional student lounge' },
  { id: 'sample-hangout-3', title: 'Lakeside coffee walk', when: 'Sample · Sunday morning', place: 'Fictional lakeside path' },
];

export function SocialPreview() {
  return <View style={styles.wrap}>
    <Banner tone="warning" title="Social preview · sample content"
      body="Campus hangouts aren’t live yet. These fictional examples show where Social is headed. Nothing here is shared with other students." />
    {SAMPLE_HANGOUTS.map(item => <Card key={item.id}>
      <View accessible accessibilityLabel={`Sample hangout: ${item.title}. ${item.when}. ${item.place}. Preview only.`} style={styles.card}>
        <Tag label="Sample" tone="warning" />
        <Txt variant="heading">{item.title}</Txt>
        <Txt variant="small" tone="secondary">{item.when} · {item.place}</Txt>
        <Txt variant="caption" tone="secondary">RSVP is coming soon.</Txt>
      </View>
    </Card>)}
    <Txt variant="small" tone="secondary" style={styles.note}>Switch back to Work for study sessions, partners and projects.</Txt>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: { gap: 4 },
  note: { textAlign: 'center', marginTop: 4 },
});
