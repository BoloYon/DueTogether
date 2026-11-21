
import { Link, Stack, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useCallback, useState, type ReactNode } from 'react';
import { useCalendar, useCampus } from './adapters';
import { routes, type CreateParams, type DetailParams } from './navigation';
import { selectFeedSections, sessionState } from './selectors';

function Screen({ title, children }: { title: string; children: ReactNode }) {
  const dark = useColorScheme() === 'dark';
  return <View style={[styles.page, { backgroundColor: dark ? '#191c22' : '#f4f6fb' }]}>
    <Stack.Screen options={{ title }} />
    <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
  </View>;
}

function Line({ children }: { children: ReactNode }) {
  const dark = useColorScheme() === 'dark';
  return <Text style={[styles.row, { color: dark ? '#f2f4ff' : '#20253a' }]}>{children}</Text>;
}

function useFocusedNow() {
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []));
  return now;
}

export function FeedScreen() {
  const { state } = useCampus();
  const calendar = useCalendar();
  const sections = selectFeedSections(state, calendar.items, useFocusedNow());
  return <Screen title="Feed">
    <Line>Work · Fictional campus demo</Line>
    <Line>Happening Now</Line>
    {sections.happeningNow.map(session => <Link key={session.id} href={routes.session(session.id)}><Line>{session.title}</Line></Link>)}
    <Line>Due Soon · Sample coursework</Line>
    {sections.dueSoon.map(item => <Line key={item.id}>{item.title}</Line>)}
    <Link href={routes.calendar}><Line>See all in Calendar</Line></Link>
    <Line>Coming Up</Line>
    {sections.comingUp.map(session => <Link key={session.id} href={routes.session(session.id)}><Line>{session.title}</Line></Link>)}
    <Line>Partners Wanted</Line>
    {sections.partnersWanted.map(post => <Link key={post.id} href={routes.person(post.authorId)}><Line>{post.title}</Line></Link>)}
    <Line>New Projects</Line>
    {sections.newProjects.map(project => <Link key={project.id} href={routes.project(project.id)}><Line>{project.title}</Line></Link>)}
    <Link href={routes.create()}><Line>Create</Line></Link>
  </Screen>;
}

export function CalendarScreen() {
  const { items } = useCalendar();
  return <Screen title="Calendar">
    <Line>Sample calendar · Fictional coursework</Line>
    <Link href={routes.calendarSettings}><Line>Calendar settings</Line></Link>
    {items.map(item => <View key={item.id}>
      <Line>{item.title} · {item.courseName}</Line>
      {(item.kind === 'quiz' || item.kind === 'exam') && <Link href={routes.create({ kind: 'session', title: 'Study for ' + item.title, course: item.courseCode })}><Line>Study for this</Line></Link>}
    </View>)}
  </Screen>;
}

export function PartnersScreen() {
  const { state, dispatch } = useCampus();
  return <Screen title="Partners">
    <Link href={routes.partnerFind}><Line>Find partners</Line></Link>
    <Link href={routes.partnerAvailability}><Line>Your availability</Line></Link>
    <Link href={routes.partnerInvite}><Line>Study invites</Line></Link>
    {state.people.map(person => <Link key={person.id} href={routes.person(person.id)}><Line>{person.name}</Line></Link>)}
    <Line>Messages</Line>
    {state.threads.map(thread => <Link key={thread.id} href={routes.chat(thread.id)}><Line>{state.people.find(person => person.id === thread.personId)?.name}</Line></Link>)}
    {state.posts.map(post => <Pressable key={post.id} accessibilityRole="button" onPress={() => dispatch({ type: 'post/connect', postId: post.id })}><Line>Connect · {post.title}</Line></Pressable>)}
  </Screen>;
}

export function ProjectsScreen() {
  const { state } = useCampus();
  return <Screen title="Projects">{state.projects.map(project => <Link key={project.id} href={routes.project(project.id)}><Line>{project.title}</Line></Link>)}</Screen>;
}

export function ProfileScreen() {
  const { state } = useCampus();
  return <Screen title="Profile">
    <Line>{state.currentUser.name}</Line>
    <Link href={routes.profileSettings}><Line>Profile settings</Line></Link>
    <Link href={routes.notifications}><Line>Notifications</Line></Link>
  </Screen>;
}

export function SessionScreen({ id }: DetailParams) {
  const { state, dispatch } = useCampus();
  const now = useFocusedNow();
  const session = state.sessions.find(item => item.id === id);
  if (!session) return <Screen title="Session"><Line>Session unavailable.</Line></Screen>;
  const { joined, hosting, ended, full } = sessionState(session, state.currentUser.id, now);
  const saved = state.savedSessionIds.includes(id);
  return <Screen title={session.title}>
    <Line>{session.location ?? session.format ?? 'Location to be announced'}</Line>
    <Line>{session.attendeeIds.length} attending</Line>
    {!hosting && !ended && (joined || !full) &&
      <Pressable accessibilityRole="button" onPress={() => dispatch({ type: joined ? 'session/leave' : 'session/join', id })}><Line>{joined ? 'Leave' : 'Join'}</Line></Pressable>}
    <Pressable accessibilityRole="button" onPress={() => dispatch({ type: saved ? 'session/unsave' : 'session/save', id })}><Line>{saved ? 'Unsave' : 'Save'}</Line></Pressable>
  </Screen>;
}

export function ProjectScreen({ id }: DetailParams) {
  const { state, dispatch } = useCampus();
  const project = state.projects.find(item => item.id === id);
  const requested = state.memberships.some(item => item.projectId === id && item.userId === state.currentUser.id && item.status === 'requested');
  if (!project) return <Screen title="Project"><Line>Project unavailable.</Line></Screen>;
  return <Screen title={project.title}>
    <Line>{project.pitch}</Line>
    <Line>{project.teamIds.length} of {project.capacity} places filled</Line>
    {project.teamIds.length < project.capacity && !project.teamIds.includes(state.currentUser.id) &&
      <Pressable accessibilityRole="button" onPress={() => dispatch({ type: requested ? 'project/cancel' : 'project/request', id })}><Line>{requested ? 'Cancel request' : 'Ask to join'}</Line></Pressable>}
  </Screen>;
}

export function PersonScreen({ id }: DetailParams) {
  const { state } = useCampus();
  const person = state.people.find(item => item.id === id);
  return <Screen title="Person"><Line>{person?.name ?? 'Profile unavailable.'}</Line></Screen>;
}

export function ChatScreen({ id }: DetailParams) {
  const { state } = useCampus();
  const thread = state.threads.find(item => item.id === id);
  return <Screen title="Conversation">
    <Line>Sample conversation · Simulated replies</Line>
    {thread?.messages.map(message => <Line key={message.id}>{message.text}</Line>)}
  </Screen>;
}

export function CreateScreen({ course, title, kind }: CreateParams) {
  return <Screen title="Create"><Line>{kind === 'session' ? 'Study session draft' : 'Creation preview'}</Line>{title && <Line>{title}</Line>}{course && <Line>{course}</Line>}</Screen>;
}

export function CalendarSettingsScreen() {
  return <Screen title="Calendar settings"><Line>Sample mode is active. The live Canvas connection will be wired during integration.</Line></Screen>;
}

export function PartnerFindScreen() { return <Screen title="Find partners"><Link href={routes.partners}><Line>Browse fictional classmates</Line></Link></Screen>; }
export function AvailabilityScreen() { return <Screen title="Availability"><Line>Sample schedules are loaded in the campus adapter.</Line></Screen>; }
export function InviteScreen() { return <Screen title="Study invites"><Line>No sample invites yet.</Line></Screen>; }
export function ProfileSettingsScreen() { return <Screen title="Profile settings"><Line>Profile editing is assigned to lane B1.</Line></Screen>; }
export function NotificationsScreen() {
  const { state, dispatch } = useCampus();
  return <Screen title="Notifications">{state.notifications.map(item =>
    <Pressable accessibilityRole="button" key={item.id} onPress={() => dispatch({ type: 'notification/read', id: item.id })}>
      <Line>{item.read ? '' : 'Unread · '}{item.title}</Line><Line>{item.body}</Line>
    </Pressable>)}</Screen>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 20, gap: 8 },
  row: { fontSize: 16, paddingVertical: 12 },
});
