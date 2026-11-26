Mautic.asyncContent = function (container) {
    mQuery(container || document)
        .find('[data-mautic-async-src]')
        .addBack('[data-mautic-async-src]')
        .each(function () {
            const el = this;

            if (el.dataset.mauticAsyncState) {
                return;
            }

            el.dataset.mauticAsyncState = 'pending';

            if (el.dataset.mauticAsyncLoading === 'lazy' && 'IntersectionObserver' in window) {
                const observer = new IntersectionObserver(function (entries) {
                    if (entries.some(function (entry) { return entry.isIntersecting; })) {
                        observer.disconnect();
                        delete el.mauticAsyncObserver;
                        Mautic.loadAsyncContent(el);
                    }
                });
                el.mauticAsyncObserver = observer;
                observer.observe(el);
            } else {
                Mautic.loadAsyncContent(el);
            }
        });
};

Mautic.loadAsyncContent = function (el) {
    const $el = mQuery(el);

    if (!el.id) {
        Mautic.asyncContentSequence = (Mautic.asyncContentSequence || 0) + 1;
        el.id = 'mautic-async-' + Mautic.asyncContentSequence;
    }

    if (typeof $el.data('mauticAsyncSkeleton') === 'undefined') {
        $el.data('mauticAsyncSkeleton', $el.html());
    }

    el.dataset.mauticAsyncState = 'loading';
    el.setAttribute('aria-busy', 'true');

    mQuery.ajax({url: el.dataset.mauticAsyncSrc, type: 'GET', dataType: 'json'})
        .done(function (response) {
            if (!document.body.contains(el)) {
                return;
            }

            el.dataset.mauticAsyncState = 'loaded';
            el.removeAttribute('aria-busy');
            response.target = '#' + el.id;
            Mautic.processPageContent(response);
        })
        .fail(function () {
            if (!document.body.contains(el)) {
                return;
            }

            el.dataset.mauticAsyncState = 'failed';
            el.removeAttribute('aria-busy');
            $el.html(mQuery('<div>').html($el.data('mauticAsyncSkeleton')).find('template[data-mautic-async-error]').html());
        });
};

mQuery(document).on('click', '[data-mautic-async-retry]', function () {
    const el = mQuery(this).closest('[data-mautic-async-src]');

    el.html(el.data('mauticAsyncSkeleton'));
    Mautic.loadAsyncContent(el[0]);
});

Mautic.unloadAsyncContent = function (container) {
    mQuery(container).find('[data-mautic-async-src]').addBack('[data-mautic-async-src]').each(function () {
        if (this.mauticAsyncObserver) {
            this.mauticAsyncObserver.disconnect();
            delete this.mauticAsyncObserver;
        }
    });
};
