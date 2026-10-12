const {test, expect} = require('@playwright/test');

const linear = `<div data-stepper>
  <div data-step>First <button type="button" data-step-next><span>Next</span></button></div>
  <div data-step hidden>Second <button type="button" data-step-back>Back</button><button type="button" data-step-next>Next</button></div>
  <div data-step hidden>Third <button type="button" data-step-next>End</button></div>
  <div data-stepper-progress></div>
</div>`;

const remote = (action = '/valid', extra = '') => `<div data-stepper>
  <div data-step="upload"><form action="${action}" method="post" data-step-submit="configuration">
    <input name="token" value="csrf-token" type="hidden"><input name="title" value="Example" required>
    <input type="file" name="file"><button type="submit" name="operation" value="analyze">Upload</button>
    ${extra}</form><button type="button" data-step-next>Skip</button></div>
  <div data-step="configuration" hidden></div>
  <div data-step="processing" hidden><h2>Asset ready</h2></div>
  <div data-step-loading hidden>Loading</div>
</div>`;

const mount = async (page, html) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.Mautic?.Stepper));
  await page.evaluate(markup => { document.body.innerHTML = markup; }, html);
  await expect(page.locator('[data-step]').first()).toHaveAttribute('aria-hidden', 'false');
};

const recordEvents = async page => page.evaluate(() => {
  window.events = [];
  ['show', 'shown', 'submit', 'success', 'error'].forEach(name => {
    document.querySelector('[data-stepper]').addEventListener(`stepper:${name}`, event => {
      window.events.push({name, status: event.detail.response?.status, hasError: Boolean(event.detail.error)});
    });
  });
});

const requests = async request => (await request.get('/requests')).json();

test.beforeEach(async ({request}) => { await request.post('/reset'); });

test('linear navigation, keyboard focus, boundaries and progress without IDs', async ({page}) => {
  await mount(page, linear);
  await expect(page.locator('[data-stepper-progress]')).toHaveAttribute('aria-valuenow', '33');
  await page.getByRole('button', {name: 'Next'}).press('Enter');
  await expect(page.locator('[data-step]').nth(1)).toBeVisible();
  await expect(page.locator('[data-step]').nth(1)).toBeFocused();
  await expect(page.locator('[data-stepper-progress]')).toHaveAttribute('aria-valuenow', '67');
  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.locator('[data-step]').first()).toBeVisible();
  await page.getByRole('button', {name: 'Next'}).click();
  await page.getByRole('button', {name: 'Next'}).click();
  await page.getByRole('button', {name: 'End'}).click();
  await expect(page.locator('[data-step]').nth(2)).toBeVisible();
  await expect(page.locator('[data-stepper-progress]')).toHaveAttribute('aria-valuenow', '100');
});

test('named branching and back follow the visited path', async ({page}) => {
  await mount(page, `<div data-stepper><div data-step="start"><button data-step-next="advanced">Advanced</button></div>
    <div data-step="basic" hidden>Basic</div><div data-step="advanced" hidden><button data-step-back>Back</button></div></div>`);
  await page.getByRole('button', {name: 'Advanced'}).click();
  await expect(page.locator('[data-step="advanced"]')).toBeVisible();
  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.locator('[data-step="start"]')).toBeVisible();
});

test('public API and named back accept arbitrary names without CSS selectors', async ({page}) => {
  await mount(page, `<div data-stepper><div data-step="start"><button data-step-next='0'>Next</button></div>
    <div data-step="0" hidden><button data-step-back="start">Back</button></div><div data-step='quoted&quot;name' hidden>Last</div></div>`);
  await page.getByRole('button', {name: 'Next'}).click();
  await expect(page.locator('[data-step="0"]')).toBeVisible();
  await page.getByRole('button', {name: 'Back'}).click();
  const result = await page.evaluate(() => {
    const root = document.querySelector('[data-stepper]');
    const instance = window.Mautic.Stepper.getOrCreateInstance(root);
    return [instance === new window.Mautic.Stepper(root), instance.show('missing'), instance.show('quoted"name')];
  });
  expect(result).toEqual([true, false, true]);
  await expect(page.getByText('Last', {exact: true})).toBeVisible();
});

test('show and submit events can cancel the default behavior', async ({page, request}) => {
  await mount(page, remote());
  await page.evaluate(() => {
    const root = document.querySelector('[data-stepper]');
    root.addEventListener('stepper:show', event => event.preventDefault());
    root.addEventListener('stepper:submit', event => event.preventDefault());
  });
  await page.getByRole('button', {name: 'Skip'}).click();
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect(page.locator('[data-step="upload"]')).toBeVisible();
  expect(await requests(request)).toHaveLength(0);
});

test('POST uploads FormData, CSRF fields and submitter; injected controls work', async ({page, request}) => {
  await mount(page, remote());
  await recordEvents(page);
  await page.locator('input[type="file"]').setInputFiles({name: 'sample.txt', mimeType: 'text/plain', buffer: Buffer.from('file contents')});
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect(page.locator('[data-step="configuration"]')).toBeVisible();
  const sent = await requests(request);
  expect(sent).toHaveLength(1);
  expect(sent[0].body).toContain('csrf-token');
  expect(sent[0].body).toContain('sample.txt');
  expect(sent[0].body).toContain('file contents');
  expect(sent[0].body).toContain('analyze');
  expect(sent[0].headers['x-requested-with']).toBe('XMLHttpRequest');
  expect(sent[0].headers['content-type']).toContain('multipart/form-data; boundary=');
  expect(await page.evaluate(() => window.events.map(event => event.name))).toEqual(['submit', 'show', 'shown', 'success']);
  await page.getByRole('button', {name: 'Process'}).click();
  await expect(page.getByRole('heading', {name: 'Asset ready'})).toBeVisible();
});

test('422 replaces current content, keeps the step and supports resubmission', async ({page, request}) => {
  await mount(page, remote('/invalid'));
  await recordEvents(page);
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid file');
  await expect(page.locator('[data-step="upload"]')).toBeVisible();
  await expect(page.locator('[data-step="configuration"]')).toBeHidden();
  await expect(page.locator('input[name="title"]')).toBeFocused();
  expect(await page.evaluate(() => window.events)).toEqual([{name: 'submit', hasError: false}, {name: 'error', status: 422, hasError: false}]);
  await page.locator('input[name="title"]').fill('Corrected');
  await page.getByRole('button', {name: 'Retry'}).click();
  await expect(page.locator('[data-step="configuration"]')).toBeVisible();
  expect(await requests(request)).toHaveLength(2);
});

test('native validation prevents remote submission', async ({page, request}) => {
  await mount(page, remote());
  await page.locator('input[name="title"]').fill('');
  await page.getByRole('button', {name: 'Upload'}).click();
  expect(await requests(request)).toHaveLength(0);
  await expect(page.locator('[data-step="upload"]')).toBeVisible();
});

test('busy state blocks duplicate submission and navigation, then restores loading', async ({page, request}) => {
  await mount(page, remote('/slow'));
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect(page.locator('[data-step-loading]')).toBeVisible();
  await expect(page.locator('[data-stepper]')).toHaveAttribute('aria-busy', 'true');
  await page.getByRole('button', {name: 'Upload'}).click();
  await page.getByRole('button', {name: 'Skip'}).click();
  await expect(page.locator('[data-step="upload"]')).toBeVisible();
  await expect(page.locator('[data-step="configuration"]')).toBeVisible();
  await expect(page.locator('[data-step-loading]')).toBeHidden();
  await expect(page.locator('[data-stepper]')).not.toHaveAttribute('aria-busy');
  expect(await requests(request)).toHaveLength(1);
});

for (const action of ['/failure', '/json', '/redirect']) {
  test(`${action} preserves current content and reports an error`, async ({page}) => {
    await mount(page, remote(action));
    await recordEvents(page);
    await page.getByRole('button', {name: 'Upload'}).click();
    await expect.poll(() => page.evaluate(() => window.events.some(event => event.name === 'error'))).toBe(true);
    await expect(page.locator('[data-step="upload"]')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Upload'})).toBeVisible();
    await expect(page.locator('[data-step-loading]')).toBeHidden();
  });
}

test('network failure restores loading and emits error', async ({page}) => {
  await mount(page, remote());
  await recordEvents(page);
  await page.route('**/valid', route => route.abort());
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect.poll(() => page.evaluate(() => window.events.some(event => event.hasError))).toBe(true);
  await expect(page.locator('[data-step="upload"]')).toBeVisible();
  await expect(page.locator('[data-step-loading]')).toBeHidden();
});

test('unknown submit target and cross-origin action do not send requests', async ({page, request}) => {
  await mount(page, remote());
  await page.locator('form').evaluate(form => form.setAttribute('data-step-submit', 'missing'));
  await page.getByRole('button', {name: 'Upload'}).click();
  expect(await requests(request)).toHaveLength(0);
  await recordEvents(page);
  await page.locator('form').evaluate(form => {
    form.setAttribute('data-step-submit', 'configuration');
    form.action = 'https://example.com/upload';
  });
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect.poll(() => page.evaluate(() => window.events.some(event => event.hasError))).toBe(true);
  expect(await requests(request)).toHaveLength(0);
});

test('empty submit target advances to the next step and honors submitter action', async ({page, request}) => {
  await mount(page, remote('/failure'));
  await page.locator('form').evaluate(form => form.setAttribute('data-step-submit', ''));
  await page.getByRole('button', {name: 'Upload'}).evaluate(button => button.setAttribute('formaction', '/valid'));
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect(page.locator('[data-step="configuration"]')).toBeVisible();
  expect((await requests(request))[0].url).toBe('/valid');
});

test('nested and independent steppers remain isolated', async ({page}) => {
  await mount(page, `<div data-stepper id="outer"><div data-step>${linear}</div><div data-step hidden>Outer second</div></div>${linear}`);
  await page.locator('#outer [data-stepper] [data-step-next]').first().click();
  await expect(page.locator('#outer > [data-step]').first()).toBeVisible();
  await expect(page.locator('#outer [data-stepper] [data-step]').nth(1)).toBeVisible();
  await expect(page.locator('body > [data-stepper]').nth(1).locator('[data-step]').first()).toBeVisible();
});

test('AJAX initialization is idempotent and removal aborts in-flight requests', async ({page}) => {
  await mount(page, linear);
  await page.evaluate(markup => { document.body.insertAdjacentHTML('beforeend', markup); }, remote('/slow'));
  await expect(page.locator('[data-step="upload"]')).toHaveAttribute('aria-hidden', 'false');
  await page.evaluate(() => {
    window.Mautic.Stepper.initialize();
    window.Mautic.Stepper.initialize();
  });
  await page.locator('body > [data-stepper]').first().getByRole('button', {name: 'Next'}).click();
  await expect(page.locator('body > [data-stepper]').first().locator('[data-step]').nth(1)).toBeVisible();
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect(page.locator('[data-step-loading]')).toBeVisible();
  await page.evaluate(() => {
    const root = document.querySelectorAll('[data-stepper]')[1];
    window.removedStepper = window.Mautic.Stepper.getOrCreateInstance(root);
    window.removedEvents = [];
    root.addEventListener('stepper:success', () => window.removedEvents.push('success'));
    root.addEventListener('stepper:error', () => window.removedEvents.push('error'));
    root.remove();
  });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.removedEvents)).toEqual([]);
  expect(await page.evaluate(() => window.removedStepper.next())).toBe(false);
});

test('server-rendered configuration submits to processing without reinitialization', async ({page, request}) => {
  await mount(page, remote());
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect(page.locator('[data-step="configuration"]')).toBeVisible();
  await page.getByRole('button', {name: 'Finish'}).click();
  await expect(page.locator('[data-step="processing"]')).toBeVisible();
  await expect(page.getByRole('link', {name: 'View asset'})).toBeVisible();
  const sent = await requests(request);
  expect(sent.map(entry => entry.url)).toEqual(['/valid', '/process']);
  expect(sent[1].body).toContain('webm');
});

test('hidden steps and loading override card and spinner display rules', async ({page}) => {
  await mount(page, `<style>.card {display:flex}.spinner {display:inline-block}</style><div data-stepper>
    <div data-step class="card"><button data-step-next>Next</button></div>
    <div data-step class="card" hidden>Second</div><div data-step-loading class="spinner" hidden>Loading</div></div>`);
  await expect(page.locator('[data-step]').nth(1)).toBeHidden();
  await expect(page.locator('[data-step-loading]')).toBeHidden();
  await page.getByRole('button', {name: 'Next'}).click();
  await expect(page.locator('[data-step]').first()).toBeHidden();
  await expect(page.locator('[data-step]').nth(1)).toBeVisible();
});

test('formnovalidate and original aria-busy state are preserved', async ({page}) => {
  await mount(page, remote());
  await page.locator('input[name="title"]').fill('');
  await page.locator('[data-stepper]').evaluate(root => root.setAttribute('aria-busy', 'false'));
  await page.getByRole('button', {name: 'Upload'}).evaluate(button => button.setAttribute('formnovalidate', ''));
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect(page.locator('[data-step="configuration"]')).toBeVisible();
  await expect(page.locator('[data-stepper]')).toHaveAttribute('aria-busy', 'false');
});

test('moving a root preserves its instance and selected step', async ({page}) => {
  await mount(page, linear);
  await page.getByRole('button', {name: 'Next'}).click();
  await page.evaluate(() => {
    const root = document.querySelector('[data-stepper]');
    const wrapper = document.createElement('section');
    document.body.append(wrapper);
    wrapper.append(root);
  });
  await page.getByRole('button', {name: 'Back'}).click();
  await expect(page.locator('[data-step]').first()).toBeVisible();
});

test('remote form interception precedes legacy handlers', async ({page, request}) => {
  await mount(page, remote());
  await page.evaluate(() => {
    window.legacyCalls = 0;
    document.querySelector('form').addEventListener('submit', () => { window.legacyCalls += 1; });
  });
  await page.getByRole('button', {name: 'Upload'}).click();
  await expect(page.locator('[data-step="configuration"]')).toBeVisible();
  expect(await page.evaluate(() => window.legacyCalls)).toBe(0);
  expect(await requests(request)).toHaveLength(1);
});
