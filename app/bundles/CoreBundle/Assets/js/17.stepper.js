/**
 * Stepper: sequential flow with optional branching and remote (HTML) form steps.
 * See docs/stepper.md.
 */
(function () {
    var ROOT = '[data-stepper]';

    function steps(root) {
        return Array.prototype.filter.call(root.querySelectorAll('[data-step]'), function (step) {
            return step.closest(ROOT) === root;
        });
    }

    function find(root, target, from, offset) {
        var list = steps(root);
        if (target) {
            return list.filter(function (step) { return step.getAttribute('data-step') === target; })[0];
        }
        return list[list.indexOf(from) + offset];
    }

    function show(root, step) {
        if (!step) return;
        var list = steps(root);
        var from = list.filter(function (item) { return !item.hidden; })[0];
        if (from === step) return;
        if (!root.dispatchEvent(new CustomEvent('stepper:show', {bubbles: true, cancelable: true, detail: {from: from, to: step}}))) return;

        step.history = from;
        list.forEach(function (item) { item.hidden = item !== step; });

        var bar = root.querySelector('[data-stepper-progress]');
        if (bar) {
            bar.style.width = ((list.indexOf(step) + 1) / list.length * 100) + '%';
        }
        root.dispatchEvent(new CustomEvent('stepper:shown', {bubbles: true, detail: {from: from, to: step}}));
    }

    function current(root) {
        return steps(root).filter(function (item) { return !item.hidden; })[0];
    }

    function loading(root, on) {
        root.querySelectorAll('[data-step-loading]').forEach(function (el) {
            if (el.closest(ROOT) === root) el.hidden = !on;
        });
        root.setAttribute('aria-busy', on ? 'true' : 'false');
    }

    function submit(root, form, button) {
        var from = current(root);
        var to = find(root, form.getAttribute('data-step-submit'), from, 1);
        if (!to) return;

        loading(root, true);
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form, button),
            credentials: 'same-origin',
            headers: {'Accept': 'text/html', 'X-Requested-With': 'XMLHttpRequest'}
        }).then(function (response) {
            return response.text().then(function (html) {
                if (response.status === 422) {
                    from.innerHTML = html;
                    root.dispatchEvent(new CustomEvent('stepper:error', {bubbles: true, detail: {response: response}}));
                } else if (response.ok && !response.redirected) {
                    to.innerHTML = html;
                    show(root, to);
                    root.dispatchEvent(new CustomEvent('stepper:success', {bubbles: true, detail: {response: response}}));
                } else {
                    throw new Error('Stepper request failed (' + response.status + ')');
                }
            });
        }).catch(function (error) {
            root.dispatchEvent(new CustomEvent('stepper:error', {bubbles: true, detail: {error: error}}));
        }).then(function () {
            loading(root, false);
        });
    }

    document.addEventListener('click', function (event) {
        var button = event.target.closest('[data-step-next], [data-step-back]');
        var root = button && button.closest(ROOT);
        if (!root) return;

        var next = button.hasAttribute('data-step-next');
        var target = button.getAttribute(next ? 'data-step-next' : 'data-step-back');
        var from = current(root);
        show(root, !next && !target && from.history ? from.history : find(root, target, from, next ? 1 : -1));
    });

    document.addEventListener('submit', function (event) {
        var form = event.target;
        var root = form.hasAttribute && form.hasAttribute('data-step-submit') && form.closest(ROOT);
        if (!root) return;

        event.preventDefault();
        submit(root, form, event.submitter);
    });
})();
