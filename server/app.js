/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const config = require('config');
const logger = require('pino')(config.logger.pino);
const pinoEx = require('express-pino-logger')({ logger });

const path = require('path');
const compress = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const expressStatusMonitor = require('express-status-monitor');
const passport = require('passport');
const errorHandler = require('errorHandler');
const flash = require('express-flash');
const bodyParser = require('body-parser');

const homeController = require('./controllers/home');
const apiController = require('./controllers/api');
const contactController = require('./controllers/contact');
const userController = require('./controllers/user');
const typedefController = require('./controllers/typedef');
//const invokeProviderMethod = require('./providers');

const express = require('express');
const passportConfig = require('./auth/passport');

const app = express();

app.set('host', process.env.OPENSHIFT_NODEJS_IP || config.host ||'0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || config.port || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
if (process.env.NODE_ENV === "development") app.use(expressStatusMonitor());
app.use(helmet());
app.use(cors());
app.use(compress());
if (process.env.NODE_ENV === "development") app.use(pinoEx); // logger
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// these do NOT need sessions
app.get('/api/user', userController.getUserDetails);
app.post('/api/user/logout', apiController.logout);
app.post('/api/user/login', userController.postLogin);
app.post('/api/user/signup', userController.postSignup);

// these use JWT
app.get('/api/typedefs', typedefController.find);
app.post('/api/typedefs', typedefController.create);
app.get('/api/typedefs/:_key', typedefController.get);
app.put('/api/typedefs/:_key', typedefController.update);
app.delete('/api/typedefs/:_key', typedefController.remove);

app.get('/api/users', userController.find);
app.post('/api/users', userController.create);
app.get('/api/users/:_key', userController.get);
app.put('/api/users/:_key', userController.update);
app.delete('/api/users/:_key', userController.remove);

//app.post('/api/invoke', invokeProviderMethod);


// For oAuth based routes we use Sessions
app.use(session(Object.assign({}, {
	resave: false,	// do not save unless modified
	saveUninitialized: false,	// do not create until something stored
	secret: process.env.SESSION_SECRET || (Math.random() * Date.now()).toString("36"),
	cookie: { maxAge: 1209600000, sameSite: 'none', secure: false }, // two weeks in milliseconds
	// store: new MongoStore({}) //TODO: add ArangoDB session store with auto-expiration
}, config.session)));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.logger = logger;

// Host the public folder
app.use('/', express.static(path.resolve(__dirname, './public'), { maxAge: 31557600000 }));	// 1 year maxAge

app.use((req, res, next) => {
	res.locals.user = req.user;
	next();
});
app.use((req, res, next) => {
	// After successful login, redirect back to the intended page
	if (!req.user
		&& req.path !== '/login'
		&& req.path !== '/signup'
		&& !req.path.match(/^\/auth/)
		&& !req.path.match(/\./)) {
		req.session.returnTo = req.originalUrl;
	} else if (req.user
		&& (req.path === '/account' || req.path.match(/^\/api/))) {
		req.session.returnTo = req.originalUrl;
	}
	next();
});

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
// app.get('/logout', userController.logout);
// app.get('/forgot', userController.getForgot);
// app.post('/forgot', userController.postForgot);
// app.get('/reset/:token', userController.getReset);
// app.post('/reset/:token', userController.postReset);
// app.get('/signup', userController.getSignup);
// app.post('/signup', userController.postSignup);
// app.get('/contact', contactController.getContact);
// app.post('/contact', contactController.postContact);
// app.get('/account/verify', passportConfig.isAuthenticated, userController.getVerifyEmail);
// app.get('/account/verify/:token', passportConfig.isAuthenticated, userController.getVerifyEmailToken);
// app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
// app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
// app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
// app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
// app.get('/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);


function oAuthCallbackHandler(provider) {
	return (req, res, next) => {
		if (!req.session.returnTo) return next(new Error("Invalid session. Please try login again"));
		// if (!req.session.remotePubKey) return next(new Error("Caller did not send any key"));
		passport.authenticate(provider, (err, user, info) => {
			if (err) { return next(err); }
			if (!user) { return res.redirect(req.session.returnTo + `#Err="oAuth Login Failed"` || '/login'); }
			req.logIn(user, function (err) {
				if (err) { return next(err); }
				// const token = Utils.createSealedBox({ s: req.session.id, e: req.session.cookie.expires }, req.session.remotePubKey);
				return res.redirect(req.session.returnTo /*+ `#token=${token}`*/ || ('/users/' + user.username));
			});
		})(req, res, next);
	}
}
function oAuthPreHandler(req, res, next) {
	req.session.remotePubKey = req.query.pubKey;
	req.session.returnTo = req.query.redirect || req.headers.referer;
	next();
}

app.get('/auth/google', oAuthPreHandler, passport.authenticate('google', { scope: ['profile', 'email'], accessType: 'offline', prompt: 'consent' }));
app.get('/auth/google/callback', oAuthCallbackHandler('google'));
app.get('/auth/linkedin', oAuthPreHandler, passport.authenticate('linkedin', { state: 'SOME STATE' }));
app.get('/auth/linkedin/callback', oAuthCallbackHandler('linkedin'));
app.get('/auth/github', oAuthPreHandler, passport.authenticate('github'));
app.get('/auth/github/callback', oAuthCallbackHandler('github'));

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
	// only use in development
	app.use(errorHandler({logger}));
} else {
	app.use((err, req, res, next) => {
		logger.error(err);
		res.status(500).send('Server Error');
	});
}

module.exports = app;