/** NotificationBundle **/
Mautic.notificationOnLoad = function (container, response) {
    if (mQuery(container + ' #list-search').length) {
        Mautic.activateSearchAutocomplete('list-search', 'notification');
    }

    Mautic.activatePreviewPanelUpdate();
};

Mautic.selectNotificationType = function(notificationType) {
    if (notificationType == 'list') {
        mQuery('#leadList').removeClass('hide');
        mQuery('#publishStatus').addClass('hide');
        mQuery('.page-header h3').text(mauticLang.newListNotification);
    } else {
        mQuery('#publishStatus').removeClass('hide');
        mQuery('#leadList').addClass('hide');
        mQuery('.page-header h3').text(mauticLang.newTemplateNotification);
    }

    mQuery('#notification_notificationType').val(notificationType);

    mQuery('body').removeClass('noscroll');

    mQuery('.notification-type-modal').remove();
    mQuery('.notification-type-modal-backdrop').remove();
};

Mautic.standardNotificationUrl = function(options) {
    if (!options) {
        return;
    }

    var url = options.windowUrl;
    if (url) {
        var editEmailKey = '/notifications/edit/notificationId';
        var previewEmailKey = '/notifications/preview/notificationId';
        if (url.indexOf(editEmailKey) > -1 ||
            url.indexOf(previewEmailKey) > -1) {
            options.windowUrl = url.replace('notificationId', mQuery('#campaignevent_properties_notification').val());
        }
    }

    return options;
};

Mautic.disabledNotificationAction = function(opener) {
    if (typeof opener == 'undefined') {
        opener = window;
    }

    var notification = opener.mQuery('#campaignevent_properties_notification').val();

    var disabled = notification === '' || notification === null;

    opener.mQuery('#campaignevent_properties_editNotificationButton').prop('disabled', disabled);
};

Mautic.activatePreviewPanelUpdate = function () {
    var notificationPreview = mQuery('#notification-preview');
    var notificationForm    = mQuery('form[name="notification"]');

    if (notificationPreview.length && notificationForm.length) {
        var previewFields = {
            'notification[heading]': notificationPreview.find('[data-notification-preview="heading"]'),
            'notification[message]': notificationPreview.find('[data-notification-preview="message"]'),
            'notification[button]': notificationPreview.find('[data-notification-preview="button"]')
        };

        notificationForm.find('input,textarea').on('input', function () {
            var $this = mQuery(this);
            var name  = $this.attr('name');
            var previewField = previewFields[name];

            if (previewField && previewField.length) {
                var value = $this.val().trim();
                var fallback = previewField.attr('data-notification-preview-default') || '';

                previewField.text(value || fallback);
                if (name === 'notification[button]') {
                    previewField.toggleClass('hide', !value);
                }
            }
        });
    }
};
