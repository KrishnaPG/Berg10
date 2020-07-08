/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const atExit = require('exit-hook'); 

const app = require('./app');
const _appWs = require('./appWs')(app); // setup webSockets

const db = require('./models/db');

// initialize the user collection and start the server
let server = null;
db.init().then(() => {
	server = app.listen(app.get('port'), app.get('host'));
	server.on('listening', () => app.logger.info(`Berg10 is listening on ${app.get('host')}:${app.get('port')}`));
	server.on('error', (e) => {
		if (e.code === 'EADDRINUSE') {
			app.logger.info(`Address ${app.get('host')}:${app.get('port')} is in use, retrying...`);
			setTimeout(() => {
				server.close();
				server.listen(app.get('port'), app.get('host'));
			}, 1000);
		}
	});
}).catch(ex => app.logger.error(`db.init() failed: ${ex.stack}`));

// avoid unnecessary warnings
process.on('unhandledRejection', (reason, p) =>
	app.logger.error(`Unhandled Rejection ${reason.stack}`)
);

//Graceful shutdown on termination
atExit(() => {
	if(server) server.close();
	if(db) db.close();
});
