// Static HTML pages: clean URL -> file + SEO metadata. Every page here is sent
// through lib/seo.js so it gets a unique title, description, canonical URL,
// social tags and (where relevant) structured data.
const { organizationJsonLd, websiteJsonLd } = require('./seo');

const NOINDEX = 'noindex,nofollow';

const PAGES = {
  '/': {
    file: 'index.html',
    title: 'YogSetu — Verified Yoga Teachers & Yoga Jobs in India',
    description: 'Find a credential-verified yoga teacher near you in 24 hours — or find yoga teaching jobs. Every YogSetu teacher is checked with the issuing body and re-verified every year.',
    jsonld: (origin) => [organizationJsonLd(origin), websiteJsonLd(origin)],
  },
  '/about': {
    file: 'about.html',
    title: 'About YogSetu — The Bridge Between You and the Right Yoga Teacher',
    description: 'YogSetu helps individuals, families and organisations discover and connect with verified yoga teachers across India. An initiative by YogKulam.',
    dynamicMeta: true, // title/description come from the admin-managed About content
    jsonld: (origin) => [organizationJsonLd(origin)],
  },
  '/contact': {
    file: 'contact.html',
    title: 'Contact YogSetu — Talk to the Team',
    description: 'Questions about teacher verification, posting a yoga requirement or partnering with YogSetu? Get in touch with the team.',
  },
  '/teacher-benefits': {
    file: 'teacher-benefits.html',
    title: 'For Yoga Teachers — Free Verified Profile & Yoga Jobs | YogSetu',
    description: 'Create a free, verified yoga teacher profile on YogSetu. No subscription, no lead fees — and a live board of students and organisations looking for your style.',
  },
  '/privacy': { file: 'privacy.html', title: 'Privacy Policy | YogSetu', description: 'How YogSetu collects, uses and protects your account details, profile content and connection data.' },
  '/terms': { file: 'terms.html', title: 'Terms & Conditions | YogSetu', description: 'The terms for using YogSetu as a yoga teacher or client: verification, connections, requirements and off-platform payments.' },
  '/refund': { file: 'refund.html', title: 'Refund Policy | YogSetu', description: "YogSetu's refund policy for the platform access fee and how session-fee refunds work between clients and teachers." },
  '/login': { file: 'login.html', title: 'Log In | YogSetu', description: 'Log in to your YogSetu client, teacher or admin account.', robots: NOINDEX },
  '/signup': { file: 'signup.html', title: 'Sign Up | YogSetu', description: 'Create a free YogSetu account as a yoga student or teacher.', robots: NOINDEX },
  '/forgot-password': { file: 'forgot-password.html', title: 'Reset Your Password | YogSetu', description: 'Reset your YogSetu password.', robots: NOINDEX },
  '/post-requirement': { file: 'post-requirement.html', title: 'Post a Yoga Requirement | YogSetu', description: 'Tell verified yoga teachers what you need.', robots: NOINDEX },
  '/client-dashboard': { file: 'client-dashboard.html', title: 'Client Dashboard | YogSetu', description: 'Your YogSetu client workspace.', robots: NOINDEX },
  '/teacher-dashboard': { file: 'teacher-dashboard.html', title: 'Teacher Dashboard | YogSetu', description: 'Your YogSetu teacher workspace.', robots: NOINDEX },
  '/admin-dashboard': { file: 'admin-dashboard.html', title: 'Admin Dashboard | YogSetu', description: 'YogSetu admin workspace.', robots: NOINDEX },
};

// .html files that have moved to a new (or dynamic) URL
const LEGACY = {
  '/index.html': '/',
  '/teachers.html': '/yoga-teachers',
  '/requirements.html': '/yoga-jobs',
};

// prototype files that ship in /public but must never be indexed
const PROTOTYPES = ['/yogsetu-page.html', '/yogsetu-mono-theme.html'];

module.exports = { PAGES, LEGACY, PROTOTYPES, NOINDEX };
