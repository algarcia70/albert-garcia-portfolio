(function () {
  'use strict';
  var measurementId = 'G-CTJX51L789';
  var storageKey = 'ag-analytics-consent-v1';
  var lifetime = 180 * 24 * 60 * 60 * 1000;
  var enabled = false;
  var loaded = false;
  var returnFocus;
  var preference = readPreference();

  function readPreference() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && saved.expires > Date.now() &&
          (saved.choice === 'accepted' || saved.choice === 'declined')) return saved.choice;
    } catch (_) { /* Storage unavailable: no saved preference. */ }
    return null;
  }

  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      ['', location.hostname, '.' + location.hostname, 'al-garcia.com', '.al-garcia.com'].forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' +
          (domain ? '; Domain=' + domain : '');
      });
    });
  }

  function startAnalytics() {
    if (loaded) return;
    enabled = true;
    loaded = true;
    window['ga-disable-' + measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);
  }

  function choose(choice) {
    preference = choice;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ choice: choice, expires: Date.now() + lifetime }));
    } catch (_) { /* The choice still applies to this page if storage is blocked. */ }
    panel.hidden = true;
    if (returnFocus) returnFocus.focus();
    if (choice === 'accepted') {
      startAnalytics();
    } else {
      enabled = false;
      window['ga-disable-' + measurementId] = true;
      clearAnalyticsCookies();
      // Unload an already-running tag after withdrawal, including automatic events.
      if (loaded) location.reload();
    }
  }

  var panel = document.createElement('section');
  panel.className = 'cookie-notice';
  panel.setAttribute('aria-label', 'Analytics cookie choices');
  panel.hidden = true;
  panel.innerHTML = '<div><strong>Analytics settings</strong>' +
    '<p>I use Google Analytics cookies to understand visits, pages viewed, and meeting-link clicks. You can turn analytics off and still use everything here. <a href="/privacy/">Privacy details</a>.</p></div>' +
    '<div class="cookie-actions"><button type="button" data-choice="declined">Turn analytics off</button>' +
    '<button type="button" data-choice="accepted">Turn analytics on</button></div>';
  document.body.appendChild(panel);
  panel.querySelectorAll('[data-choice]').forEach(function (button) {
    button.addEventListener('click', function () { choose(button.dataset.choice); });
  });
  document.querySelectorAll('[data-cookie-settings]').forEach(function (button) {
    button.hidden = false;
    button.addEventListener('click', function () {
      returnFocus = button;
      panel.hidden = false;
      panel.querySelector('button').focus();
    });
  });
  if (preference !== 'declined') startAnalytics();
  else {
    window['ga-disable-' + measurementId] = true;
    clearAnalyticsCookies();
  }
  window.addEventListener('storage', function (event) {
    if (event.key === storageKey || event.key === null) {
      if (readPreference() !== preference) {
        window['ga-disable-' + measurementId] = true;
        enabled = false;
        location.reload();
      }
    }
  });
  document.addEventListener('click', function (event) {
    if (!enabled) return;
    var link = event.target.closest('a[href]');
    if (link && new URL(link.href, location.href).hostname === 'cal.com') {
      window.gtag('event', 'meeting_request_click', {
        link_domain: 'cal.com', page_path: location.pathname
      });
    }
  });
}());
