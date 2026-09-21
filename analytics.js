window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-CTJX51L789', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});

document.addEventListener('click', function (event) {
  var link = event.target.closest('a[href]');
  if (!link) return;
  var url = new URL(link.href, window.location.href);
  if (url.hostname === 'cal.com') {
    gtag('event', 'meeting_request_click', {
      link_domain: 'cal.com',
      page_path: window.location.pathname
    });
  }
});
