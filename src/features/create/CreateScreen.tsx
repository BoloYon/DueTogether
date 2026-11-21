import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import {
  Body, Button, Choices, ErrorBanner, Notice, Screen, Segmented, TextField, formatDayLabel, upcomingDayKeys, useNow,
  type ChoiceOption,
} from '@/components/campus';
import { useCampus } from '@/shared/adapters';
import { routes, type CreateParams } from '@/shared/navigation';
import {
  DURATION_OPTIONS, TEXT_MAX, TITLE_MAX, buildPostDraft, buildProjectDraft, buildSessionDraft, initialPostForm,
  initialProjectForm, initialSessionForm, resolveKind, type CreateKind, type Errors, type PostForm, type ProjectForm,
  type SessionForm, type SubjectMode,
} from './drafts';

const KIND_OPTIONS: ChoiceOption<CreateKind>[] = [
  { value: 'session', label: 'Session', accessibilityLabel: 'Study session' },
  { value: 'partner', label: 'Partner post' },
  { value: 'project', label: 'Project' },
];

export function CreateScreen(params: CreateParams) {
  const [kind, setKind] = useState<CreateKind>(() => resolveKind(params));
  const prefilled = !!(params.title || params.course);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen title="Create">
        <Segmented label="What to create" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        {prefilled && kind === 'session' && <Notice tone="accent">Draft prefilled. Review the time and place before creating the session.</Notice>}
        {kind === 'session' && <SessionFormView params={params} />}
        {kind === 'partner' && <PostFormView params={params} />}
        {kind === 'project' && <ProjectFormView params={params} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function CourseOrTopic({ mode, onMode, course, onCourse, topic, onTopic, errors, courses }: {
  mode: SubjectMode; onMode: (mode: SubjectMode) => void; course: string; onCourse: (value: string) => void;
  topic: string; onTopic: (value: string) => void; errors: { course?: string; topic?: string }; courses: string[];
}) {
  return (
    <>
      <Choices label="Subject" value={mode} onChange={onMode}
        options={[{ value: 'course', label: 'Course' }, { value: 'topic', label: 'Personal topic' }]} />
      {mode === 'course' ? (
        <>
          <TextField label="Course code" value={course} onChangeText={onCourse} placeholder="e.g. MAT 240"
            autoCapitalize="characters" maxLength={20} error={errors.course} />
          {courses.length > 0 && (
            <Choices label="Your courses" value={courses.find(item => item === course.trim().toUpperCase())} onChange={onCourse}
              options={courses.map(item => ({ value: item, label: item }))} />
          )}
        </>
      ) : (
        <TextField label="Topic" value={topic} onChangeText={onTopic} placeholder="e.g. Interview prep" maxLength={60} error={errors.topic} />
      )}
    </>
  );
}

function useSubmit<F, T>(build: (form: F) => { ok: true; draft: T } | { ok: false; errors: Errors<F> }, send: (draft: T) => ReturnType<ReturnType<typeof useCampus>['dispatch']>, onDone: (id: string) => void) {
  const [errors, setErrors] = useState<Errors<F>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const submit = (form: F) => {
    const built = build(form);
    if (!built.ok) {
      setErrors(built.errors);
      setFailure('Check the highlighted fields.');
      return;
    }
    const result = send(built.draft);
    if (!result.ok) {
      setErrors({});
      setFailure(result.message);
      return;
    }
    setErrors({});
    setFailure(null);
    if (result.id) onDone(result.id);
  };
  return { errors, failure, submit };
}

function SessionFormView({ params }: { params: CreateParams }) {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const now = useNow(30_000);
  const [form, setForm] = useState<SessionForm>(() => initialSessionForm(params, Date.now()));
  const set = <K extends keyof SessionForm>(key: K) => (value: SessionForm[K]) => setForm(current => ({ ...current, [key]: value }));
  const { errors, failure, submit } = useSubmit(
    (value: SessionForm) => buildSessionDraft(value, Date.now()),
    draft => dispatch({ type: 'session/create', draft }),
    id => router.replace(routes.session(id)),
  );
  return (
    <>
      <TextField label="Title" value={form.title} onChangeText={set('title')} placeholder="e.g. Exam review" maxLength={TITLE_MAX} error={errors.title} />
      <CourseOrTopic mode={form.subjectMode} onMode={set('subjectMode')} course={form.course} onCourse={set('course')}
        topic={form.topic} onTopic={set('topic')} errors={errors} courses={state.currentUser.courses} />
      <Choices label="Day" value={form.day} onChange={set('day')} error={errors.day}
        options={upcomingDayKeys(now, 7).map(day => ({ value: day, label: formatDayLabel(day, now) }))} />
      <TextField label="Start time" value={form.startTime} onChangeText={set('startTime')} placeholder="14:30"
        hint="24-hour or am/pm, local time" maxLength={8} error={errors.startTime} />
      <Choices label="Duration" value={String(form.durationMinutes)} onChange={value => set('durationMinutes')(Number(value))}
        error={errors.durationMinutes}
        options={DURATION_OPTIONS.map(minutes => ({ value: String(minutes), label: minutes < 60 ? `${minutes} min` : `${minutes / 60} h`, accessibilityLabel: `${minutes} minutes` }))} />
      <Choices label="Format" value={form.format} onChange={set('format')}
        options={[{ value: 'in-person', label: 'In person' }, { value: 'online', label: 'Online' }]} />
      <TextField label={form.format === 'online' ? 'Meeting link or note (optional)' : 'Location'} value={form.location}
        onChangeText={set('location')} placeholder={form.format === 'online' ? 'e.g. Video call link shared in chat' : 'e.g. Library, room 2'}
        maxLength={80} error={errors.location} />
      <TextField label="Capacity (optional)" value={form.capacity} onChangeText={set('capacity')} keyboardType="number-pad"
        placeholder="No limit" hint="Including you" maxLength={3} error={errors.capacity} />
      <TextField label="Description (optional)" value={form.description} onChangeText={set('description')} multiline maxLength={TEXT_MAX} />
      <ErrorBanner message={failure} />
      <Button label="Create session" onPress={() => submit(form)} />
      <Body secondary small>Sessions are saved on this device only. Classmates in this demo are fictional.</Body>
    </>
  );
}

function PostFormView({ params }: { params: CreateParams }) {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const [form, setForm] = useState<PostForm>(() => initialPostForm(params));
  const set = <K extends keyof PostForm>(key: K) => (value: PostForm[K]) => setForm(current => ({ ...current, [key]: value }));
  const { errors, failure, submit } = useSubmit(buildPostDraft, draft => dispatch({ type: 'post/create', draft }), () => router.navigate(routes.partners));
  return (
    <>
      <TextField label="Title" value={form.title} onChangeText={set('title')} placeholder="e.g. Looking for a lab partner" maxLength={TITLE_MAX} error={errors.title} />
      <CourseOrTopic mode={form.subjectMode} onMode={set('subjectMode')} course={form.course} onCourse={set('course')}
        topic={form.topic} onTopic={set('topic')} errors={errors} courses={state.currentUser.courses} />
      <TextField label="Goals" value={form.description} onChangeText={set('description')} multiline maxLength={TEXT_MAX}
        placeholder="What do you want to work on together?" error={errors.description} />
      <ErrorBanner message={failure} />
      <Button label="Post" onPress={() => submit(form)} />
      <Body secondary small>Your post appears in Partners Wanted for other students on this device.</Body>
    </>
  );
}

function ProjectFormView({ params }: { params: CreateParams }) {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const [form, setForm] = useState<ProjectForm>(() => initialProjectForm(params));
  const set = <K extends keyof ProjectForm>(key: K) => (value: ProjectForm[K]) => setForm(current => ({ ...current, [key]: value }));
  const { errors, failure, submit } = useSubmit(buildProjectDraft, draft => dispatch({ type: 'project/create', draft }), id => router.replace(routes.project(id)));
  return (
    <>
      <TextField label="Project title" value={form.title} onChangeText={set('title')} maxLength={TITLE_MAX} error={errors.title} />
      <TextField label="Pitch" value={form.pitch} onChangeText={set('pitch')} multiline maxLength={TEXT_MAX}
        placeholder="What are you building and why?" error={errors.pitch} />
      <TextField label="Open roles" value={form.roles} onChangeText={set('roles')} placeholder="e.g. Design, Firmware"
        hint="Separate roles with commas" maxLength={200} error={errors.roles} />
      <TextField label="Team size" value={form.capacity} onChangeText={set('capacity')} keyboardType="number-pad"
        hint="Including you" maxLength={2} error={errors.capacity} />
      <Choices label="Category" value={form.categoryMode} onChange={set('categoryMode')}
        options={[{ value: 'course', label: 'Course' }, { value: 'personal', label: 'Personal' }]} />
      {form.categoryMode === 'course' ? (
        <>
          <TextField label="Course code" value={form.course} onChangeText={set('course')} autoCapitalize="characters" maxLength={20} error={errors.course} />
          {state.currentUser.courses.length > 0 && (
            <Choices label="Your courses" value={state.currentUser.courses.find(item => item === form.course.trim().toUpperCase())} onChange={set('course')}
              options={state.currentUser.courses.map(item => ({ value: item, label: item }))} />
          )}
        </>
      ) : (
        <TextField label="Category name" value={form.category} onChangeText={set('category')} maxLength={40} error={errors.category} />
      )}
      <ErrorBanner message={failure} />
      <Button label="Create project" onPress={() => submit(form)} />
    </>
  );
}
