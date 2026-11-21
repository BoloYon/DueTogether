import { StyleSheet, View } from 'react-native';
import { Banner, Card, Txt } from './ui';

/** Clearly labeled preview. There is no campus social network behind it. */
const SAMPLE_HANGOUTS = [
  { id: 'sample-hangout-1', title: 'Sunset frisbee on the lawn', when: 'Friday evening', place: 'Quad' },
  { id: 'sample-hangout-2', title: 'Board game night', when: 'Saturday', place: 'Student lounge' },
  { id: 'sample-hangout-3', title: 'Lakeside coffee walk', when: 'Sunday morning', place: 'Lakeside path' },
];

export function SocialPreview() {
  return <View style={styles.wrap}>
    <Banner tone="warning" title="Sample hangouts" body="RSVPs are unavailable in this preview." />
    {SAMPLE_HANGOUTS.map(item => <Card key={item.id}>
      <View accessible accessibilityLabel={`Sample hangout: ${item.title}. ${item.when}. ${item.place}. Preview only.`} style={styles.card}>
        <Txt variant="heading">{item.title}</Txt>
        <Txt variant="small" tone="secondary">{item.when} · {item.place}</Txt>
      </View>
    </Card>)}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: { gap: 4 },
});
