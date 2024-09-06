// tour.js
import Shepherd from '/app/bundles/CoreBundle/Assets/js/libraries/tour/shepherd.mjs';

/**
 * Resets all tours by clearing stored progress and restarting the current tour.
 *
 * Use this function to debug from the beginning.
 */
window.resetTour = function () {
  // Remove the current step from sessionStorage for all tours
  Object.keys(sessionStorage).forEach(key => {
    if (key.endsWith('Step')) {
      sessionStorage.removeItem(key);
    }
  });

  // Remove the completed tour status from localStorage for all tours
  Object.keys(localStorage).forEach(key => {
    if (key.endsWith('Completed')) {
      localStorage.removeItem(key);
    }
  });

  // If there's a current tour, complete it
  if (window.currentTour) {
    window.currentTour.complete();
  }

  // Re-initialize the tour for the current page
  initTourForCurrentPage();
  console.log('All tours have been reset and the current tour has been restarted.');
}

/**
 * Waits for an element matching the selector to appear in the DOM.
 *
 * @param {string} selector - CSS selector for the element.
 * @returns {Promise<Object>} Promise resolving to the mQuery object of the found element.
 *
 * Handles dynamically loaded content in Mautic pages like importing contacts.
 */

function lazyElement(selector) {
  return new Promise((resolve) => {
    // Check if the element is already present
    const checkElement = () => {
      const element = mQuery(selector);
      if (element.length) {
        resolve(element);
        return true;
      }
      return false;
    };

    // If the element is already present, resolve immediately
    if (checkElement()) return;

    // Create a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(() => {
      if (checkElement()) {
        observer.disconnect(); // Stop observing once the element is found
      }
    });

    // Start observing the document body for added/removed nodes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

/**
 * Initializes the appropriate tour based on the current page URL.
 *
 * - Determines the tour steps and key based on the current path
 * - Checks if the tour has already been completed
 * - Creates a new Shepherd Tour instance if steps are available
 * - Resumes from the last viewed step or starts from the beginning
 * - Manages tour completion status and step progression
 *
 */
function initTourForCurrentPage() {
  const currentPath = window.location.pathname;
  console.log('Current path:', currentPath);
  console.log('Shepherd library:', typeof Shepherd !== 'undefined' ? 'Loaded' : 'Not loaded');
  let tourSteps;
  let tourKey;

  if (currentPath.startsWith('/s/dashboard')) {
    console.log('Initializing dashboard tour');
    tourSteps = dashboardTourSteps;
    tourKey = 'dashboardTour';

  } else if (currentPath.startsWith('/s/config')) {
    console.log('Initializing contacts tour');
    tourSteps = configTour;
    tourKey = 'configTour';

  } else if (currentPath === '/s/contacts') {
    console.log('Initializing contacts tour');
    tourSteps = contactsTourSteps;
    tourKey = 'contactsTour';

  } else if (currentPath === '/s/contacts/import/new') {
    console.log('Initializing import contacts tour');
    tourSteps = importContactsTourSteps;
    tourKey = 'importContactsTour';

  } else if (currentPath.startsWith('/s/segments')) {
    console.log('Initializing segments tour');
    tourSteps = segmentsTour;
    tourKey = 'segmentsTour';

  } else if (currentPath.startsWith('/s/campaigns')) {
    console.log('Initializing campaigns tour');
    tourSteps = campaignsTour;
    tourKey = 'campaignsTour';

  } else if (currentPath.startsWith('/s/emails')) {
    console.log('Initializing emails tour');
    tourSteps = emailsTour;
    tourKey = 'emailsTour';

  } else if (currentPath.startsWith('/s/messages')) {
    console.log('Initializing marketing messages tour');
    tourSteps = marketingMessagesTour;
    tourKey = 'marketingMessagesTour';

  } else if (currentPath.startsWith('/s/focus')) {
    console.log('Initializing focus items tour');
    tourSteps = focusItemsTour;
    tourKey = 'focusItemsTour';

  } else if (currentPath.startsWith('/s/assets')) {
    console.log('Initializing assets tour');
    tourSteps = assetsTour;
    tourKey = 'assetsTour';

  } else if (currentPath.startsWith('/s/forms')) {
    console.log('Initializing forms tour');
    tourSteps = formsTour;
    tourKey = 'formsTour';

  } else if (currentPath.startsWith('/s/pages')) {
    console.log('Initializing landing pages tour');
    tourSteps = landingPagesTour;
    tourKey = 'landingPagesTour';

  } else if (currentPath.startsWith('/s/dwc')) {
    console.log('Initializing dynamic content tour');
    tourSteps = dynamicContentTour;
    tourKey = 'dynamicContentTour';

  } else if (currentPath === '/s/points') {
    console.log('Initializing point actions tour');
    tourSteps = pointActionsTour;
    tourKey = 'pointActionsTour';

  } else if (currentPath.startsWith('/s/points/triggers')) {
    console.log('Initializing point triggers tour');
    tourSteps = pointTriggersTour;
    tourKey = 'pointTriggersTour';

  } else if (currentPath.startsWith('/s/points/groups')) {
    console.log('Initializing point groups tour');
    tourSteps = pointGroupsTour;
    tourKey = 'pointGroupsTour';

  } else if (currentPath.startsWith('/s/stages')) {
    console.log('Initializing stages tour');
    tourSteps = stagesTour;
    tourKey = 'stagesTour';

  } else if (currentPath.startsWith('/s/reports')) {
    console.log('Initializing reports tour');
    tourSteps = reportsTour;
    tourKey = 'reportsTour';

  } else if (currentPath.startsWith('/s/tags')) {
    console.log('Initializing tags tour');
    tourSteps = tagsTour;
    tourKey = 'tagsTour';

  } else {
    console.log('No tour steps for this path');
    tourSteps = [];
    tourKey = 'unknownTour';
  }

  // Check if this specific tour has already been completed
  if (localStorage.getItem(`${tourKey}Completed`) === 'true') {
    console.log(`${tourKey} already completed, not starting again.`);
    return; // Exit if this specific tour has already been completed
  }

  if (tourSteps.length > 0) {
    window.currentTour = new Shepherd.Tour({
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        classes: 'shepherd-theme-default',
        scrollTo: { behavior: 'smooth', block: 'center' },
      },
    });

    tourSteps.forEach(step => {
      console.log('Adding step:', step.id);
      window.currentTour.addStep(step);
    });

    const currentStep = sessionStorage.getItem(`${tourKey}Step`);
    if (currentStep) {
      window.currentTour.show(currentStep);
    } else {
      console.log('Starting tour');
      window.currentTour.start();
    }

    // Store completed tour status for this specific tour
    window.currentTour.on('complete', () => {
      localStorage.setItem(`${tourKey}Completed`, 'true');
    });

    window.currentTour.on('show', (e) => {
      sessionStorage.setItem(`${tourKey}Step`, e.step.id);
    });
  }
}

// Dashboard tour
const dashboardTourSteps = [
  {
    id: 'dashboard1',
    title: 'Meet your new Dashboard',
    text: 'Click here to go to the dashboard',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    advanceOn: {
      selector: 'a[data-menu-link="mautic_dashboard_index"]',
      event: 'click'
    },
  },
  {
    id: 'dashboard2',
    title: 'Date range filter',
    text: 'Use this date picker to filter and display the data of the widgets within your chosen date range. By default, Mautic displays data from the past 30 days up to today. It filters all widgets.',
    attachTo: {
      element: 'form[name="daterange"]',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    beforeShowPromise: () => lazyElement('form[name="daterange"]'),
    modalOverlayOpeningPadding: 8
  },
  {
    id: 'dashboard3',
    title: 'Create new widget',
    text: 'Here you create a new widget. That\'s how we call the charts used to display information based on available data. As soon as the data starts being collected, check this page again.',
    attachTo: {
      element: '.std-toolbar.btn-group',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    modalOverlayOpeningPadding: 8
  },
  {
    id: 'dashboard4',
    title: 'Main menu navigation',
    text: 'In the meanwhile, navigate through Mautic\'s main menu to easily access and explore its various components. That\'s all for now. Explore other pages.',
    attachTo: {
      element: 'nav.nav-sidebar',
      on: 'right'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    modalOverlayOpeningPadding: 8
  },
  {
    id: 'dashboard5',
    title: 'Connect tracking script',
    text: 'To improve your experience and start collecting visitor data, go to the configuration and set up your tracking script.',
    attachTo: {
      element: '#admin-menu',
      on: 'bottom'
    },
    buttons: [{
      text: 'Go to Configuration',
      action: function () {
        window.currentTour.complete();
        mQuery('a#mautic_config_index').click();
      }
    }],
    modalOverlayOpeningPadding: 8
  },
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
    advanceOn: {
      selector: 'a[href="/s/contacts/import/new"][data-toggle="ajax"]',
      event: 'click'
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
    beforeShowPromise: () => lazyElement('#lead_field_import_list_chosen'),
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
      element: '#match-fields',
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
    ],
    beforeShowPromise: () => lazyElement('a.btn.btn-success[href="/s/contacts/import"]'),
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

// Config tour
const configTour = [
  {
    id: 'config1',
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
    id: 'config2',
    title: 'Tracking Settings',
    text: 'Click here to find your tracking settings',
    attachTo: {
      element: 'a[href="#trackingconfig"]',
      on: 'right'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    advanceOn: { selector: 'a[href="#trackingconfig"]', event: 'click' }
  },
  {
    id: 'config3',
    title: 'Copy Tracking Code',
    text: 'Copy this code and paste it at the end of the body tag in your website',
    attachTo: {
      element: '#trackingconfig pre',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    beforeShowPromise: () => lazyElement('#trackingconfig pre'),
  },
]

// Segments tour
const segmentsTour = [
  {
    id: 'segments1',
    title: 'Contact segments',
    text: "Segments are used to categorize your contacts into specific lists based on their attributes, behavior, or campaign participation.\n\nYou can use one segment as a filter condition for another segment, allowing for more detailed and targeted segmentation.\n\nAdditionally, segments can be displayed in a preference center, enabling your contacts to choose the types of information they want to receive.",
    attachTo: {
      element: 'h1.pull-left.page-header-title',
      on: 'right'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }]
  },
  {
    id: 'segments2',
    title: 'Create a new segment',
    text: 'Click "New" to add a new segment',
    attachTo: {
      element: 'a#new',
      on: 'bottom'
    },
    advanceOn: { selector: 'a#new', event: 'click' }
  },
  {
    id: 'segments3',
    title: 'Segment name',
    text: 'The name field determines the internal label for the segment, which will be visible in the segments list.',
    attachTo: {
      element: '#leadlist_name',
      on: 'right'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    beforeShowPromise: () => lazyElement('#leadlist_name')
  },
  {
    id: 'segments4',
    title: 'Public name',
    text: 'Use the Public Name field to display a different name to customers. This field is especially useful if you want the segment to be visible in the preference center for managing list subscriptions later.',
    attachTo: {
      element: '#leadlist_publicName',
      on: 'right'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }]
  },
  {
    id: 'segments5',
    title: 'Segment category',
    text: 'Select or create a category to organize your segments.',
    attachTo: {
      element: '#leadlist_category_chosen',
      on: 'left'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }]
  },
  {
    id: 'segments6',
    title: 'Activate segment',
    text: 'Set the segment as Active to use in Campaigns later.',
    attachTo: {
      element: '#leadlist_isPublished_1',
      on: 'top'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }]
  },
  {
    id: 'segments7',
    title: 'Configure segment',
    text: "Now click here to start configuring your Segment. We'll create the first to monitor invalid addresses (bounces).",
    attachTo: {
      element: 'a[href="#filters"][role="tab"]',
      on: 'bottom'
    },
    advanceOn: { selector: 'a[href="#filters"][role="tab"]', event: 'click' }
  },
  {
    id: 'segments8',
    title: 'Add filters',
    text: "Click to open the list and select Bounced - Email. This filter will embrace future contacts that can't receive emails (e.g. inbox full and others) to help you ensure the quality of your campaigns.",
    attachTo: {
      element: '#available_segment_filters_chosen',
      on: 'right'
    },
    buttons: [{ text: 'OK', action: () => window.currentTour.next() }],
    advanceOn: { selector: '#available_segment_filters_chosen', event: 'click' },
    beforeShowPromise: () => lazyElement('#available_segment_filters_chosen')
  },
  {
    id: 'segments9',
    title: 'Refine conditions',
    text: 'Based on the field chosen, relevant options will appear to refine your conditions for any selected filter.',
    attachTo: {
      element: '#leadlist_filters_1_operator',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: () => window.currentTour.next() }],
    beforeShowPromise: () => lazyElement('#leadlist_filters_1_operator')
  },
  {
    id: 'segments10',
    title: 'Select filter value',
    text: 'In this field, select Yes.',
    attachTo: {
      element: '#leadlist_filters_1_properties_filter_chosen',
      on: 'right'
    },
    advanceOn: { selector: '#leadlist_filters_1_properties_filter_chosen', event: 'click' },
    beforeShowPromise: () => lazyElement('#leadlist_filters_1_properties_filter_chosen')
  },
  {
    id: 'segments11',
    title: 'Multiple filters',
    text: 'For multiple filters, select additional fields from the dropdown and specify whether the filters should use "AND" or "OR" expressions.',
    attachTo: {
      element: '#leadlist_filters_1',
      on: 'top'
    },
    buttons: [{ text: 'Finish', action: () => window.currentTour.complete() }],
    beforeShowPromise: () => lazyElement('#leadlist_filters_1')
  }
]

// Campaigns tour
const campaignsTour = [
  {
    id: 'campaigns1',
    title: 'Welcome to your campaign headquarters',
    text: "Here, you'll manage and power your marketing automation processes within Mautic.",
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Emails tour
const emailsTour = [
  {
    id: 'emails1',
    title: 'Craft your email masterpieces',
    text: 'Here, you can effortlessly create, customize, and track your email communications.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Marketing messages tour
const marketingMessagesTour = [
  {
    id: 'marketingmessages1',
    title: 'Your multi-channel messaging hub',
    text: 'This is your go-to destination for crafting and managing personalized marketing messages across various channels at once. It allows you organize the sending for SMS, email, social media, and push notifications.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Focus items tour
const focusItemsTour = [
  {
    id: 'focusitems1',
    title: 'Capture attention with focus items',
    text: "Focus items allow you to create pop-ups, modals, and banners designed to capture your visitors' attention and encourage specific actions, such as subscribing to a newsletter or completing a form.",
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Assets tour
const assetsTour = [
  {
    id: 'assets1',
    title: 'Manage your digital treasures',
    text: 'This is your central hub for managing all digital assets used in your marketing campaigns.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Forms tour
const formsTour = [
  {
    id: 'forms1',
    title: 'Design your data collection tools',
    text: 'Here, you can create and manage forms to capture valuable customer data effectively.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Landing pages tour
const landingPagesTour = [
  {
    id: 'landingpages1',
    title: 'Create compelling landing pages',
    text: "This is where you can design, customize, and optimize your landing pages with ease. Using Mautic's intuitive drag-and-drop builder, you can effortlessly add images, forms, and CTAs to capture leads and boost conversions.",
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Dynamic content tour
const dynamicContentTour = [
  {
    id: 'dynamiccontent1',
    title: 'Personalize your content dynamically',
    text: 'Here, you can craft personalized experiences for your audience by delivering tailored content based on user behavior and preferences. Customize website content, emails, and landing pages dynamically to ensure each visitor receives relevant and engaging messages.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Point actions tour
const pointActionsTour = [
  {
    id: 'pointactions1',
    title: 'Set up automated responses',
    text: 'Here, you can define and automate responses to user interactions within your marketing campaigns. Set up actions like sending follow-up emails, adjusting lead scores, or adding contacts to segments based on predefined conditions and triggers.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Point triggers tour
const pointTriggersTour = [
  {
    id: 'pointtriggers1',
    title: 'Configure your marketing triggers',
    text: 'Automate smaller workflows by configuring actions that respond to user behavior and events. These triggers activate based on interactions such as form submissions, email opens, or page visits, streamlining your marketing processes.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Point groups tour
const pointGroupsTour = [
  {
    id: 'pointgroups1',
    title: 'Organize your point strategies',
    text: "Groups allow you to organize separate amount of points. They're useful to have control over strategies targeting several audiences and help you to differentiate engagement metrics for each.",
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Stages tour
const stagesTour = [
  {
    id: 'stages1',
    title: 'Map out your customer journey',
    text: 'Here, you can define and manage the various stages of the customer lifecycle, from initial contact to post-purchase engagement. By organizing leads into distinct stages, you can implement targeted marketing strategies, personalize communications, and analyze progression through the marketing funnel.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Reports tour
const reportsTour = [
  {
    id: 'reports1',
    title: 'Gain insights from your data',
    text: 'This section enables you to create, customize, and analyze a wide range of reports. Track key metrics such as campaign effectiveness, email engagement, lead generation, and more to gain valuable insights into your marketing performance.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

// Tags tour
const tagsTour = [
  {
    id: 'tags1',
    title: 'Organize contacts with tags',
    text: 'Tags are customizable labels you can apply to contacts within Mautic. They help streamline segmentation and targeted marketing. Here, you can create, edit, and manage tags, making it easier to filter and search for specific groups of contacts.',
    attachTo: {
      element: '.pull-left.page-header-title',
      on: 'right'
    },
  },
];

/**
 * Sets up tour initialization and keyboard shortcut (Ctrl+Alt+R) to reset the tour.
 *
 */
// Make the whole functionality load
document.addEventListener('DOMContentLoaded', function () {
  initTourForCurrentPage();

  // Add keyboard shortcut to reset tour
  document.addEventListener('keydown', function (event) {
    // Reset tour when 'Ctrl+Alt+R' is pressed
    if (event.ctrlKey && event.altKey && event.key === 'r') {
      resetTour();
    }
  });
});