function testMyEmailVerifierApi() {
    const button = document.querySelector('[onclick="testMyEmailVerifierApi()"]');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = 'Testing...';

    fetch('/s/myemailverifier/test', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            Mautic.showNotification(data.message, 'success');
        } else {
            Mautic.showNotification(data.message, 'error');
        }
    })
    .catch(error => {
        Mautic.showNotification('Network error: ' + error.message, 'error');
    })
    .finally(() => {
        button.disabled = false;
        button.textContent = originalText;
    });
}