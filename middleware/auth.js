// import Cookies from 'js-cookie'

// const CookieName = 'adminBro-session';

export default function (context) {
	const { store } = context;
	// if store is not initialized, on every route try doing a login to server
	// with existing cookies, if any. If we succeed, user will be loaded into 
	// the store, else nothing happens.
	if (!store.state.user) {
		store.dispatch("login", null).then(() => {
			console.log("login done");
		}).catch(ex => {
			console.error("login failed", ex);
		});
	} else {
		// store is already initialized with a user. 
		// We could verify since how long the store has been initialized with the user
		// but server will reject the stale cookies, so no point in doing extra work here
	}
}
