// Admin-editable copy for the Terms, Privacy, Refund and Contact pages.
// Each page is one JSON document in cms_content_blocks (block_key page_<slug>);
// the defaults below are what visitors see until an admin saves something, and
// they double as the schema that aboutContent.sanitize() whitelists against.
const { merge, sanitize } = require('./aboutContent');

const PAGE_SLUGS = ['terms', 'privacy', 'refund', 'contact'];
const LABELS = { terms: 'Terms & Conditions page', privacy: 'Privacy Policy page', refund: 'Refund Policy page', contact: 'Contact page' };
const ICONS = ['email', 'phone', 'pin', 'clock', 'chat', 'shield'];
const MAX_JSON_BYTES = 60000;

const blockKey = (slug) => `page_${slug}`;

const legalCallout = {
  title: 'Questions about this page?',
  text: 'Write to us and a real person will reply — usually within 1–2 business days.',
  label: 'Contact the team',
  url: '/contact',
};

const DEFAULTS = {
  terms: {
    meta: {
      title: 'Terms & Conditions | YogSetu',
      description: 'The terms for using YogSetu as a yoga teacher or client: verification, connections, requirements and off-platform payments.',
    },
    hero: {
      kicker: 'Legal',
      title: 'Terms & Conditions',
      lede: 'The simple ground rules for teachers and clients using YogSetu — what we do, what we don’t, and how connections work.',
    },
    updated: 'September 2026',
    highlights: [
      { title: 'A bridge, not an employer', text: 'We verify credentials; we don’t employ teachers.' },
      { title: '5 a day, to keep it real', text: 'Requests and requirement posts are capped daily.' },
      { title: 'Payments stay direct', text: 'You settle sessions with your teacher or client.' },
    ],
    sections: [
      { heading: 'Using YogSetu', body: 'YogSetu is a connection-request platform for yoga teachers and clients. We verify teacher credentials with issuing bodies but do not employ teachers or guarantee outcomes of any session.' },
      { heading: 'Rate limits', body: 'To prevent spam, clients are limited to 5 connection requests and 5 requirement postings per day.' },
      { heading: 'Verification', body: 'Teacher verification badges are reviewed annually. YogSetu may suspend a listing that no longer meets verification standards.' },
      { heading: 'Off-platform payments', body: 'Session pricing and payment are agreed directly between client and teacher after a connection is approved. YogSetu is not a party to that transaction.' },
    ],
    callout: legalCallout,
  },
  privacy: {
    meta: {
      title: 'Privacy Policy | YogSetu',
      description: 'How YogSetu collects, uses and protects your account details, profile content and connection data.',
    },
    hero: {
      kicker: 'Legal',
      title: 'Privacy Policy',
      lede: 'What we collect, why we collect it, and the promise we keep: your contact details stay private until you approve a connection.',
    },
    updated: 'September 2026',
    highlights: [
      { title: 'We never sell your data', text: 'Personal data is not sold to third parties.' },
      { title: 'Contacts stay hidden', text: 'Shared only after a connection is approved.' },
      { title: 'Your data, your call', text: 'Ask for a copy or deletion at any time.' },
    ],
    sections: [
      { heading: 'What we collect', body: 'Account details you provide (name, email, phone), profile content you add (bio, certifications, photos), and usage data needed to operate connection requests and the requirement board.' },
      { heading: 'How we use it', body: 'To operate the verification process, match connection requests, send email notifications, and maintain the audit trail described in our Terms. We do not sell personal data to third parties.' },
      { heading: 'Contact details & connections', body: 'A client’s or teacher’s contact details are shared with the other party only once a connection request is approved — never before.' },
      { heading: 'Your choices', body: 'You can request a copy of your data or ask us to delete your account at any time by contacting hello@yogsetu.com.' },
    ],
    callout: { ...legalCallout, title: 'Want a copy of your data, or your account deleted?' },
  },
  refund: {
    meta: {
      title: 'Refund Policy | YogSetu',
      description: 'YogSetu’s refund policy for the platform access fee and how session-fee refunds work between clients and teachers.',
    },
    hero: {
      kicker: 'Legal',
      title: 'Refund Policy',
      lede: 'When a fee applies, when it doesn’t, and how to reach us if something was charged in error.',
    },
    updated: 'September 2026',
    highlights: [
      { title: 'Nothing to pay up front', text: 'The access fee is only charged once a teacher approves.' },
      { title: 'Sessions are between you', text: 'Session fees are paid directly, off-platform.' },
      { title: '7 days to tell us', text: 'Raise a charge made in error within 7 days.' },
    ],
    sections: [
      { heading: 'Platform access fee', body: 'Where the platform access fee is enabled, it is charged only once a teacher approves a connection — never on request submission — so there is nothing to refund for a declined or unanswered request.' },
      { heading: 'Session payments', body: 'YogSetu does not collect payment for yoga sessions themselves; that happens directly between client and teacher off-platform. Refunds for session fees are between the two parties.' },
      { heading: 'Requesting a refund', body: 'If you believe a platform access fee was charged in error, contact hello@yogsetu.com within 7 days with your account email and the date of the charge.' },
    ],
    callout: { ...legalCallout, title: 'Charged in error?', text: 'Send us your account email and the date of the charge within 7 days and we’ll look into it.' },
  },
  contact: {
    meta: {
      title: 'Contact YogSetu — Talk to the Team',
      description: 'Questions about teacher verification, posting a yoga requirement or partnering with YogSetu? Get in touch with the team.',
    },
    hero: {
      kicker: 'Contact us',
      title: 'We read every message',
      lede: 'Questions about verification, a requirement, or partnering with YogKulam — send a note and a real person replies.',
    },
    form: {
      title: 'Send us a message',
      subtitle: 'Tell us a little and we’ll point you to the right person.',
      topics: ['General question', 'Teacher verification', 'Report an issue', 'Partnership / press'],
      placeholder: 'How can we help?',
      submit_label: 'Send message',
      success_title: 'Message sent — thank you!',
      success_text: 'We’ve received it and will reply to your email, usually within 1–2 business days.',
    },
    info_title: 'Prefer to reach us directly?',
    info: [
      { icon: 'email', title: 'Email', text: 'hello@yogsetu.com' },
      { icon: 'phone', title: 'Phone / WhatsApp', text: 'Shared once a support ticket is open' },
      { icon: 'pin', title: 'Based in', text: 'Lucknow & Gorakhpur, Uttar Pradesh, India' },
      { icon: 'clock', title: 'Response time', text: 'Usually within 1–2 business days' },
    ],
  },
};

function getDefaults(slug) {
  return JSON.parse(JSON.stringify(DEFAULTS[slug]));
}

const isSlug = (slug) => PAGE_SLUGS.includes(slug);

// saved document (or null) over the defaults
function effective(slug, saved) {
  return merge(getDefaults(slug), saved);
}

function clean(slug, input) {
  return sanitize(getDefaults(slug), input);
}

module.exports = { PAGE_SLUGS, LABELS, ICONS, MAX_JSON_BYTES, blockKey, isSlug, getDefaults, effective, clean };
