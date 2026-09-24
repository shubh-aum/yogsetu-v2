require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');

const authRouter = require('./routes/auth');
const teachersRouter = require('./routes/teachers');
const clientsRouter = require('./routes/clients');
const requirementsRouter = require('./routes/requirements');
const connectionsRouter = require('./routes/connections');
const dashboardRouter = require('./routes/dashboard');
const lookupsRouter = require('./routes/lookups');
const adminRouter = require('./routes/admin');
const contentRouter = require('./routes/content');

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
app.use('/api/teachers', teachersRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/requirements', requirementsRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api', dashboardRouter);
app.use('/api/lookups', lookupsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/content', contentRouter);

// Static site (index.html, dashboards, requirement pages, css, js, assets)
// extensions:['html'] lets /teacher-dashboard resolve to teacher-dashboard.html
// (the .html URL keeps working too — this only adds the fallback).
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// 404 for anything not matched by static files or the API
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
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
