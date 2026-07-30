Mautic.sendHookTest = function() {

    var url = mQuery('#webhook_webhookUrl').val();
    var secret = mQuery('#webhook_secret').val();
    var eventTypes = mQuery("#event-types input[type='checkbox']");
    var selectedTypes = [];

    eventTypes.each(function() {
        var item = mQuery(this);
        if (item.is(':checked')) {
            selectedTypes.push(item.val());
        }
    });

    var data = {
        action: 'webhook:sendHookTest',
        url: url,
        secret: secret,
        types: selectedTypes
    };

    var spinner = mQuery('#spinner');

    // show the spinner
    spinner.removeClass('hide');

    mQuery.ajax({
        url: mauticAjaxUrl,
        data: data,
        type: 'POST',
        dataType: "json",
        success: function(response) {
            if (response.html) {
                mQuery('#tester').html(response.html);
            }
        },
        error: function (response, textStatus, errorThrown) {
            console.log(response.responseJSON);
            if (response.responseJSON.html) {
                mQuery('#tester').html(response.responseJSON.html);
            } else {
                Mautic.processAjaxError(response, textStatus, errorThrown);
            }
        },
        complete: function(response) {
            spinner.addClass('hide');
        }
    })
};

Mautic.initWebhookLogFilter = function () {
    var filter = mQuery('#webhook-log-filter');
    var rows = mQuery('[data-webhook-log-row]');
    var status = mQuery('#webhook-log-filter-status');
    var singularLabel = status.attr('data-log-label-singular');
    var pluralLabel = status.attr('data-log-label-plural');

    if (!filter.length || !rows.length || !status.length) {
        return;
    }

    var update = function () {
        var value = filter.val().trim().toLowerCase();
        var visible = 0;

        rows.each(function () {
            var row = mQuery(this);
            var matches = !value || row.attr('data-status-code').toLowerCase().indexOf(value) !== -1;
            row.toggle(matches);
            visible += matches ? 1 : 0;
        });

        status.text((visible === 1 ? singularLabel : pluralLabel).replace('%count%', visible));
    };

    filter.off('input.webhookLogFilter').on('input.webhookLogFilter', update);
    update();
};

Mautic.mauticWebhookOnLoad = function () {
    Mautic.initWebhookLogFilter();
};
