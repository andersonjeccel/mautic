// tour.js
import Shepherd from '/app/bundles/CoreBundle/Assets/js/libraries/tour/shepherd.mjs';

window.resetTour = function() {
  sessionStorage.removeItem('tourStep');
  if (window.currentTour) {
    window.currentTour.complete();
  }
  initTourForCurrentPage();
  console.log('Tour has been reset and restarted.');
};

function lazyElement(selector) {
  return new Promise((resolve) => {
    const element = mQuery(selector);
    if (element.length) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = mQuery(selector);
      if (element.length) {
        resolve(element);
        obs.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // No timeout, observer will run indefinitely until the element is found
  });
}

function initTourForCurrentPage() {
  const currentPath = window.location.pathname;
  console.log('Current path:', currentPath);
  console.log('Shepherd library:', typeof Shepherd !== 'undefined' ? 'Loaded' : 'Not loaded');
  let tourSteps;

  if (currentPath.startsWith('/s/dashboard') || currentPath.startsWith('/s/config')) {
    console.log('Initializing dashboard tour');
    tourSteps = dashboardTourSteps;
  } else if (currentPath === '/s/contacts') {
    console.log('Initializing contacts tour');
    tourSteps = contactsTourSteps;
  } else if (currentPath === '/s/contacts/import/new') {
    console.log('Initializing import contacts tour');
    tourSteps = importContactsTourSteps;
  } else {
    console.log('No tour steps for this path');
    tourSteps = [];
  }

  if (tourSteps.length > 0) {
    window.currentTour = new Shepherd.Tour({
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        classes: 'shepherd-theme-default',
        scrollTo: { behavior: 'smooth', block: 'center' },
        beforeshowpremise: ''
      },
    });

    tourSteps.forEach(step => {
      console.log('Adding step:', step.id);
      window.currentTour.addStep(step);
    });

    const currentStep = sessionStorage.getItem('tourStep');
    if (currentStep) {
      window.currentTour.show(currentStep);
    } else {
      console.log('Starting tour');
      window.currentTour.start();
    }

    window.currentTour.on('show', (e) => {
      sessionStorage.setItem('tourStep', e.step.id);
    });
  }
}

// Dashboard tour
const dashboardTourSteps = [
  {
    id: 'step1',
    title: 'Connect Tracking Script',
    text: 'We need to connect the tracking script in your website. Click the button below to go to the configuration page.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
    buttons: [{
      text: 'Go to Configuration',
      action: function () {
        mQuery('a#mautic_config_index').click();
        lazyElement('a[href="#trackingconfig"]').then(() => {
          window.currentTour.next();
        });
      }
    }]
  },
  {
    id: 'step2',
    title: 'Tracking Settings',
    text: 'Click here to find your tracking settings',
    attachTo: {
      element: 'a[href="#trackingconfig"]',
      on: 'right'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    advanceOn: {selector: 'a[href="#trackingconfig"]', event: 'click'}
  },
  {
    id: 'step3',
    title: 'Copy Tracking Code',
    text: 'Copy this code and paste it at the end of the body tag in your website',
    attachTo: {
      element: '#trackingconfig pre',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }]
  },
  {
    id: 'step4',
    title: 'Go to Dashboard',
    text: 'Click here to go to the dashboard',
    attachTo: {
      element: 'a[href="/s/dashboard"]',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    advanceOn: {
      selector: 'a[data-menu-link="mautic_dashboard_index"]',
      event: 'click'
    },
  },
  {
    id: 'step5',
    title: 'Date Range Filter',
    text: 'Use this date picker to filter and display the data of the widgets within your chosen date range. By default, Mautic displays data from the past 30 days up to today. To change this, blablaba. It filters all widgets.',
    attachTo: {
      element: 'form[name="daterange"]',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
        beforeShowPromise: () => lazyElement('form[name="daterange"]').then(() => {
      // Wait for the form[name="daterange"] element to be present
      document.querySelector('a[data-menu-link="mautic_dashboard_index"]').addEventListener('click', () => {
        lazyElement('form[name="daterange"]');
      });
    }),
    modalOverlayOpeningPadding: 8
  },
  {
    id: 'step6',
    title: 'Create New Widget',
    text: 'Here you create a new widget. That\'s how we call the charts used to display information based on available data. As soon as the data starts being collected, check this page again.',
    attachTo: {
      element: '.std-toolbar.btn-group',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    modalOverlayOpeningPadding: 8
  },
  {
    id: 'step7',
    title: 'Main Menu Navigation',
    text: 'In the meanwhile, navigate through Mautic\'s main menu to easily access and explore its various components. That\'s all for now. Explore other pages.',
    attachTo: {
      element: 'nav.nav-sidebar',
      on: 'right'
    },
    buttons: [{ text: 'Finish', action: () => window.currentTour.complete() }],
    modalOverlayOpeningPadding: 8
  }
];

// Contacts tour
const contactsTourSteps = [
  {
    id: 'contacts-step1',
    title: 'Welcome to your Contacts list!',
    text: 'Here you will be able to see all the unidentified and identified visitors that are interacting with your website. To fill or extent this list, you can import your own contacts.',
    attachTo: {
      element: () => document.querySelector('.pull-left.page-header-title'),
      on: 'right'
    },
    buttons: [
      {
        text: 'Next',
        action: () => window.currentTour.next()
      }
    ]
  },
  {
    id: 'contacts-step2',
    title: 'Toggle Anonymous Contacts',
    text: "After implementing the tracking code in your website, Mautic will start creating unidentified visitors, which are contacts that we don't have name or email address yet, based on their IP.\n\nClick here to toggle between unidentified visitors (anonymous contacts) and known visitors (contacts) later.",
    attachTo: {
      element: () => document.querySelector('#anonymousLeadButton'),
      on: 'left'
    },
    buttons: [
      {
        text: 'Next',
        action: () => window.currentTour.next()
      }
    ]
  },
  {
    id: 'contacts-step3',
    title: 'Import Contacts',
    text: "First, let's import some contacts. Click on the arrow in the contacts list to open the menu and click Import.",
    attachTo: {
      element: () => document.querySelector('button.btn.btn-default.btn-nospin.dropdown-toggle'),
      on: 'left'
    },
    buttons: [] // No buttons for this step
  }
];

// Contacts import tour
const importContactsTourSteps = [
  {
    id: 'import-step1',
    title: 'Select Your Contacts List',
    text: "Select your contacts list. You do not need a template, fields can be matched in the next screen. But it will be great to have your contacts name separated in First name and Last name. When you're ready, click Upload.",
    attachTo: {
      element: '.input-group.well.mt-lg',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'OK',
        action: () => window.currentTour.next()
      }
    ]
  },
  {
    id: 'import-step2',
    title: 'Adding to a Segment',
    text: 'In the future, you might want to add imported contacts to a previously created segment, for specific targeting in campaigns.',
    attachTo: {
      element: '#lead_field_import_list_chosen',
      on: 'left'
    },
    buttons: [
      {
        text: 'Next',
        action: () => window.currentTour.next()
      }
    ]
  },
  {
    id: 'import-step3',
    title: 'Adding Tags',
    text: 'You can also add specific tags to the contacts by selecting or creating a tag to help you track their source.',
    attachTo: {
      element: '#lead_field_import_tags_chosen',
      on: 'left'
    },
    buttons: [
      {
        text: 'Next',
        action: () => window.currentTour.next()
      }
    ]
  },
  {
    id: 'import-step4',
    title: 'Match Your Fields',
    text: "Mautic will attempt to automatically match fields in your import file based on the header rows. If a direct match isn't found, manually select the appropriate field by clicking into it and searching by the field name.",
    attachTo: {
      element: () => document.querySelectorAll('.panel-title')[1],
      on: 'top'
    },
    buttons: [
      {
        text: 'Next',
        action: () => window.currentTour.next()
      }
    ]
  },
  {
    id: 'import-step5',
    title: 'Importing Options',
    text: 'For importing over 100 contacts, opt to import in the background. You will receive a notification under the bell icon once the import is complete. For fewer than 100 contacts, you can choose to import in the browser.',
    attachTo: {
      element: '#lead_field_import_buttons_apply_toolbar',
      on: 'left'
    },
    buttons: [
      {
        text: 'OK',
        action: () => window.currentTour.next()
      }
    ]
  },
  {
    id: 'import-step6',
    title: 'Import History',
    text: 'In the import history, you can check more details about each list imported over the time. This page is also accessible using the menu on the Contacts page.',
    attachTo: {
      element: 'a.btn.btn-success[href="/s/contacts/import"]',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Next',
        action: () => {
          const historyButton = document.querySelector('a.btn.btn-success[href="/s/contacts/import"]');
          if (historyButton) {
            historyButton.addEventListener('click', () => {
              window.currentTour.complete();
            }, { once: true });
          }
          window.currentTour.next();
        }
      }
    ]
  },
  {
    id: 'import-step7',
    title: 'View New Contacts',
    text: 'Click here to see your new contacts.',
    attachTo: {
      element: 'a.btn.btn-success[href="/s/contacts?search=import_id:1"]',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Finish',
        action: () => {
          const viewContactsButton = document.querySelector('a.btn.btn-success[href="/s/contacts?search=import_id:1"]');
          if (viewContactsButton) {
            viewContactsButton.addEventListener('click', () => {
              window.currentTour.complete();
            }, { once: true });
          }
          window.currentTour.complete();
        }
      }
    ]
  }
];



// Make the whole functionality loads
document.addEventListener('DOMContentLoaded', function () {
  initTourForCurrentPage();

  // Add keyboard shortcut to reset tour
  document.addEventListener('keydown', function(event) {
    // Reset tour when 'Ctrl+Alt+R' is pressed
    if (event.ctrlKey && event.altKey && event.key === 'r') {
      resetTour();
    }
  });
});