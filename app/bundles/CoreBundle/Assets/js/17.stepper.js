/**
 * Stepper: sequential flow with optional branching and remote (HTML) form steps.
 * See docs/stepper.md.
 */
(() => {
  const ROOT = '[data-stepper]';
  const history = new WeakMap();

  const owns = (root, el) => el.closest(ROOT) === root;
  const steps = (root) => [...root.querySelectorAll('[data-step]')].filter((step) => owns(root, step));
  const current = (root) => steps(root).find((step) => !step.hidden);
  const emit = (root, name, detail = {}, cancelable = false) => root.dispatchEvent(
    new CustomEvent(`stepper:${name}`, {bubbles: true, cancelable, detail})
  );
  const busy = (root) => 'true' === root.getAttribute('aria-busy');

  const find = (root, target, from, offset) => {
    const list = steps(root);

    return target ? list.find((step) => step.getAttribute('data-step') === target) : list[list.indexOf(from) + offset];
  };

  const progress = (root) => {
    const bar = [...root.querySelectorAll('[data-stepper-progress]')].find((el) => owns(root, el));
    const indicator = [...root.querySelectorAll('[data-stepper-indicator]')].find((el) => owns(root, el));
    const list = steps(root);
    const step = current(root);

    if (!step) return;

    const position = list.indexOf(step) + 1;

    if (indicator) {
      [...indicator.children].forEach((item, index) => {
        const status = index + 1 < position ? 'complete' : index + 1 === position ? 'current' : 'incomplete';
        item.className = item.className.replace(/progress-indicator-step--\w+/, `progress-indicator-step--${status}`);
        item.classList.toggle('is-current', status === 'current');
        if (status === 'current') item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
    }

    if (!bar) return;

    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '1');
    bar.setAttribute('aria-valuemax', String(list.length));
    bar.setAttribute('aria-valuenow', String(position));
    bar.style.width = `${position / list.length * 100}%`;
  };

  const show = (root, step, back = false) => {
    const from = current(root);

    if (!step || from === step) return false;
    if (!emit(root, 'show', {from, to: step}, true)) return false;

    if (!back) {
      history.set(root, [...(history.get(root) || []), from]);
    }

    steps(root).forEach((item) => {
      item.hidden = item !== step;
    });
    progress(root);

    step.tabIndex = -1;
    step.focus();
    emit(root, 'shown', {from, to: step});

    return true;
  };

  const loading = (root, on) => {
    [...root.querySelectorAll('[data-step-loading]')].filter((el) => owns(root, el)).forEach((el) => {
      el.hidden = !on;
    });
    root.setAttribute('aria-busy', on ? 'true' : 'false');
  };

  const focusInvalid = (step) => {
    (step.querySelector('[aria-invalid="true"], :invalid') || step).focus();
  };

  const submit = async (root, form, button) => {
    const from = form.closest('[data-step]');
    const to = find(root, form.getAttribute('data-step-submit'), from, 1);

    if (!to) {
      emit(root, 'error', {error: new Error('Stepper target step not found.')});

      return;
    }

    from.tabIndex = -1;
    loading(root, true);

    let response;
    try {
      response = await fetch(button && button.hasAttribute('formaction') ? button.formAction : form.action, {
        method: 'POST',
        body: new FormData(form, button),
        credentials: 'same-origin',
        redirect: 'error',
        headers: {
          Accept: 'text/html',
          'X-Requested-With': 'XMLHttpRequest',
          ...('undefined' === typeof mauticAjaxCsrf ? {} : {'X-CSRF-Token': mauticAjaxCsrf}),
        },
      });

      if (!response.ok && 422 !== response.status) {
        throw new Error(`Stepper request failed (${response.status}).`);
      }

      if (!(response.headers.get('Content-Type') || '').startsWith('text/html')) {
        throw new Error('Stepper responses must contain HTML.');
      }

      const html = await response.text();
      loading(root, false);

      if (422 === response.status) {
        from.innerHTML = html;
        focusInvalid(from);
        emit(root, 'error', {response});

        return;
      }

      to.innerHTML = html;
      show(root, to);
      emit(root, 'success', {response});
    } catch (error) {
      loading(root, false);
      emit(root, 'error', {response, error});
    }
  };

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;

    const button = event.target.closest('[data-step-next], [data-step-back]');
    const root = button && button.closest(ROOT);

    if (!root) return;

    event.preventDefault();

    if (busy(root)) return;

    const next = button.hasAttribute('data-step-next');
    const target = button.getAttribute(next ? 'data-step-next' : 'data-step-back');
    const from = current(root);
    const visited = history.get(root) || [];

    if (!next && !target && visited.length) {
      if (show(root, visited[visited.length - 1], true)) {
        history.set(root, visited.slice(0, -1));
      }

      return;
    }

    show(root, find(root, target, from, next ? 1 : -1), !next);
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    const root = !event.defaultPrevented && form.hasAttribute('data-step-submit') && form.closest(ROOT);

    if (!root) return;

    event.preventDefault();

    if (!busy(root)) {
      submit(root, form, event.submitter);
    }
  });

  const init = () => document.querySelectorAll(ROOT).forEach(progress);

  if ('loading' === document.readyState) {
    document.addEventListener('DOMContentLoaded', init, {once: true});
  } else {
    init();
  }
})();
