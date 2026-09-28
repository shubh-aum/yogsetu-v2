require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');

const authRouter = require('./routes/auth');
const teachersRouter = require('./routes/teachers');
const teacherEngagementRouter = require('./routes/teacherEngagement');
const clientsRouter = require('./routes/clients');
const requirementsRouter = require('./routes/requirements');
const connectionsRouter = require('./routes/connections');
const dashboardRouter = require('./routes/dashboard');
const lookupsRouter = require('./routes/lookups');
const adminRouter = require('./routes/admin');
const contentRouter = require('./routes/content');
const contactRouter = require('./routes/contact');
const pagesRouter = require('./routes/pages');

const app = express();

// Middleware
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 days
}));

// JSON API — mounted before static so /api/* never falls through to a file lookup
app.use('/api/auth', authRouter);
app.use('/api/teachers', teacherEngagementRouter); // /me/* extras + public comments/questions (before /:id)
app.use('/api/teachers', teachersRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/requirements', requirementsRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api', dashboardRouter);
app.use('/api/lookups', lookupsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/content', contentRouter);
app.use('/api/contact', contactRouter);

// Public pages: clean static URLs, SEO-friendly /yoga-teachers and /yoga-jobs
// routes, legacy .html redirects, robots.txt and sitemap.xml — all sent through
// the SEO head injector. Must come before express.static.
app.use(pagesRouter);

// Static assets (css, js, images, uploads). index:false so "/" is always the
// SEO-rendered homepage from the pages router.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// 404 for anything not matched by a page, static file or the API
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  return pagesRouter.notFound(req, res);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`YogSetu server running at http://localhost:${PORT}`);
});
