import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { nextTick, reactive } from 'vue';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import MarkdownPreview from '@/components/MarkdownPreview.vue';
import { useFileStore } from '@/stores/fileStore';
import { renderMarkdown } from '@/utils/markdown';

const mocks = vi.hoisted(() => ({ route: { params: { id: '' } }, leave: [] as Array<() => void>, enter: [] as Array<() => void> }));
vi.mock('vue-router', () => ({ useRoute: () => mocks.route, useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@ionic/vue', () => ({
  IonPage: { template: '<div><slot /></div>' },
  IonContent: { template: '<div><slot /></div>' },
  IonHeader: { template: '<div><slot /></div>' },
  IonToolbar: { template: '<div><slot /></div>' },
  IonTitle: { template: '<div><slot /></div>' },
  IonButtons: { template: '<div><slot /></div>' },
  IonButton: { template: '<button><slot /></button>' },
  IonIcon: { template: '<i />' },
  IonFab: { template: '<div><slot /></div>' },
  IonFabButton: { template: '<button><slot /></button>' },
  IonModal: { template: '<div />' },
  alertController: { create: vi.fn(async () => ({ present: vi.fn() })) },
  onIonViewWillLeave: (cb: () => void) => mocks.leave.push(cb),
  onIonViewWillEnter: (cb: () => void) => mocks.enter.push(cb),
}));
vi.mock('@/components/NearbyShare.vue', () => ({ default: { template: '<div />' } }));
import EditorView from '@/views/EditorView.vue';

const i18n = () => createI18n({ legacy: false, locale: 'ja', messages: { ja: {} }, missingWarn: false, fallbackWarn: false });
const wrappers: ReturnType<typeof mount>[] = [];
beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  mocks.route = reactive({ params: { id: '' } });
  mocks.leave = [];
  mocks.enter = [];
});
afterEach(() => {
  wrappers.splice(0).forEach(w => w.unmount());
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function openEditor() {
  const store = useFileStore();
  const file = store.importFile('old.md', 'old');
  mocks.route.params.id = file.id;
  const wrapper = mount(EditorView, { global: { plugins: [i18n()], stubs: { MarkdownToolbar: true } } });
  wrappers.push(wrapper);
  return { store, wrapper, vm: wrapper.vm as any, file };
}

describe('Markdown preview', () => {
  it('keeps br and soft breaks within paragraphs, and blank lines between paragraphs', () => {
    const wrapper = mount(MarkdownPreview, { props: { content: '一行目<br>二行目\n三行目\n\n別の段落', fontSize: 18, fontFamily: 'serif' } });
    wrappers.push(wrapper);
    expect(wrapper.findAll('p')).toHaveLength(2);
    expect(wrapper.findAll('p')[0].findAll('br')).toHaveLength(2);
    expect(wrapper.attributes('style')).toContain('font-size: 18px');
  });
  it('continues to sanitize imported HTML while preserving code text', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"><script>alert(1)</script>\n\n```html\n<b>text</b>\n```');
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelector('script')).toBeNull();
    expect(div.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(div.querySelector('code')?.textContent).toBe('<b>text</b>');
  });
});

it('emits the actual IME value at compositionend, even without a final input event', async () => {
  const wrapper = mount(MarkdownEditor, { props: { modelValue: '', fontSize: 16, fontFamily: 'serif' }, global: { plugins: [i18n()] } });
  wrappers.push(wrapper);
  const textarea = wrapper.get('textarea');
  await textarea.trigger('compositionstart');
  textarea.element.value = 'にほん';
  await textarea.trigger('input');
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  textarea.element.value = '日本';
  await textarea.trigger('compositionend');
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['日本']);
});

it('uses different IDs when creating and importing files in the same millisecond', () => {
  vi.spyOn(Date, 'now').mockReturnValue(123);
  const store = useFileStore();
  const a = store.createFile('a.md');
  const b = store.importFile('b.md', 'B');
  expect(a.id).not.toBe(b.id);
  store.updateFile(b.id, 'changed');
  expect(store.files.find(f => f.id === a.id)?.content).toBe('');
});

it('exports current text and name before the autosave delay', async () => {
  const { store, wrapper, vm } = openEditor();
  const exportSpy = vi.spyOn(store, 'exportFile').mockResolvedValue();
  await wrapper.get('textarea').setValue('latest 日本');
  await wrapper.get('.file-name-input').setValue('latest.md');
  vm.exportCurrentFile();
  expect(exportSpy).toHaveBeenCalledWith(expect.objectContaining({ content: 'latest 日本', name: 'latest.md' }));
});

it('refreshes search positions and clamps the index after edits', async () => {
  vi.useFakeTimers();
  const { wrapper, vm } = openEditor();
  await wrapper.get('textarea').setValue('cat cat');
  vm.performSearch('cat');
  vm.nextMatch();
  await nextTick();
  await wrapper.get('textarea').setValue('xx cat');
  await vi.advanceTimersByTimeAsync(300);
  expect(vm.searchMatches).toEqual([3]);
  expect(vm.currentMatchIndex).toBe(0);
  await wrapper.get('textarea').setValue('none');
  await vi.advanceTimersByTimeAsync(300);
  expect(vm.searchMatches).toEqual([]);
  expect(vm.findAllMatches('')).toEqual([]);
});

it('flushes pending edits when Ionic leaves a cached page, then resumes saving', async () => {
  vi.useFakeTimers();
  const { store, wrapper, file } = openEditor();
  await wrapper.get('textarea').setValue('leave immediately');
  mocks.leave.forEach(cb => cb());
  expect(store.files.find(f => f.id === file.id)?.content).toBe('leave immediately');
  mocks.enter.forEach(cb => cb());
  await wrapper.get('textarea').setValue('back again');
  await vi.advanceTimersByTimeAsync(1000);
  expect(store.files.find(f => f.id === file.id)?.content).toBe('back again');
});

it('switches files without copying the previous draft into the new file', async () => {
  const { store, wrapper, file } = openEditor();
  const second = store.importFile('second.md', 'second');
  await wrapper.get('textarea').setValue('first updated');
  mocks.route.params.id = second.id;
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('second');
  expect(store.files.find(f => f.id === file.id)?.content).toBe('first updated');
  expect(store.files.find(f => f.id === second.id)?.content).toBe('second');
});
