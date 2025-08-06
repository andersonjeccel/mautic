function testMyEmailVerifierApi() {
    const button = document.querySelector('[onclick="testMyEmailVerifierApi()"]');
    const originalText = button.textContent;

    let resultContainer = document.getElementById('myemailverifier-test-result');
    if (!resultContainer) {
        resultContainer = document.createElement('div');
        resultContainer.id = 'myemailverifier-test-result';
        resultContainer.style.marginTop = '10px';
        button.parentNode.insertBefore(resultContainer, button.nextSibling);
    }

    button.disabled = true;
    button.textContent = 'Testing...';
    resultContainer.innerHTML = '';

    fetch('/s/myemailverifier/test', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        const alertClass = data.success ? 'alert-success' : 'alert-danger';

        resultContainer.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible">
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
                <div>
                    ${data.message}
                    ${data.data ? `<div class="myemailverifier-test-result-data"><strong>Response:</strong> ${JSON.stringify(data.data, null, 2)}</div>` : ''}
                </div>
            </div>
        `;

        if (typeof Mautic !== 'undefined' && Mautic.showNotification) {
            Mautic.showNotification(data.message, data.success ? 'success' : 'error');
        }
    })
    .catch(error => {
        resultContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible">
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
                <div>
                    Network error: ${error.message}
                </div>
            </div>
        `;

        if (typeof Mautic !== 'undefined' && Mautic.showNotification) {
            Mautic.showNotification('Network error: ' + error.message, 'error');
        }
    })
    .finally(() => {
        button.disabled = false;
        button.textContent = originalText;
    });
}