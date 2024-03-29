/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { saveSession, closeYDB } from './globals/store';
import { doLogin, doLogout, fetchUserDetails  } from './globals/axios';
import debounce from 'lodash/debounce';
import { subscribeToEvLogout, unSubscribeToEvLogout } from './globals/eventBus';
import { getMatchingRoute, decodeJWT } from './globals/utils';
import { getServerDBIdField } from './globals/settings';

import './main.css';

const LoginUI = React.lazy(() => import(/* webpackChunkName: "loginUI", webpackPrefetch: true */ './components/Login/loginUI'));
const Dashboard = React.lazy(() => import(/* webpackChunkName: "dashboard", webpackPreload: true */ './components/Dashboard/dashboard'));


class Main extends React.Component {

	constructor(props) {
		super(props);
		this._isMounted = false;
		this._saveSession = () => {
			console.log("saving state");
			// save the session details to local storage
			saveSession({ user: this.state.user, jwt: this.state.jwt });
		};
		
		this.state = {
			user: "xyz",
			jwt: null,
			isAuthInProgress: true,
			busyMsg: "Loading previous sessions, if any...",

			_debouncedSave: debounce(this._saveSession, 1500),
		};

		// check if we received a token on the browser address bar
		const [token] = getMatchingRoute(window.location, "token");
		if (token !== null) {
			console.log("Token: ", decodeURIComponent(token));
			window.history.replaceState("", document.title, window.location.pathname + window.location.search); // removes the hash			
			// use the token to get the loggedIn user details (ignores the local stored sessions)
			this.state.busyMsg = "Retrieving user details for the token";
			this.refreshUserDetails(token);
		} else {
			// check if we have a pre-existing token in storage
			props.lastSession.then(session => {
				// if no old session exists, nothing to do
				if (!session) return this.safeSetState({ isAuthInProgress: false });
				const { jwt, user } = session;
				// check if the token is readable and not yet expired
				if (!jwt || !user) return this.logout();
				const payload = decodeJWT(jwt);
				if (!payload || payload.id !== user[getServerDBIdField()])
					return this.logout();
				// trigger the dashboard UI loading, by setting the jwt
				this.safeSetState({ user, jwt, isAuthInProgress: false });
				// Also, lets try to renew the JWT and update the user details from the server in parallel.
				// We do not do server auth here synchronously because we support offline case,
				// where server may not be reachable, and user should still be able see any locally
				// stored data that is available.
				this.refreshUserDetails(jwt);
				// it may happen that the token is valid, but server may reject the JWT. This happens
				// when server is restarted and its secret is changed. In such case, user will see
				// dashboard being loaded and then flashing back to login screen.
			});
		}

		// Now, we also need to check for oAuth error on the location,
		// but we do it in the LoginUI. We check for the token here
		// because we want to validate the user as early as possible
		// even before we show the LoginUI, preferably.
	}

	componentDidMount() {
		this._isMounted = true;
		subscribeToEvLogout(this.logout);
	}
	componentWillUnmount() {
		this._isMounted = false;
		unSubscribeToEvLogout(this.logout);
		closeYDB(); // close it safely
	}
	static getDerivedStateFromProps(props, state) {
		// either props or the state has changed - trigger a session save
		if (state.user) state._debouncedSave();
		return null;
	}

	render() {
		return !this.state.jwt ?
			(<Suspense fallback={<div className="LoadingMsg">Loading the Dashboard...</div>}>
				<Dashboard user={this.state.user} jwt={this.state.jwt}/>
			</Suspense>) :
			(<Suspense fallback={<div className="LoadingMsg">Preparing for Login...</div>}>
				<LoginUI
					isAuthInProgress={this.state.isAuthInProgress}
					onFormSubmit={this.onLoginFormSubmit}
					busyMsg = {this.state.busyMsg}
				></LoginUI>
			</Suspense>);
	}

	onLoginFormSubmit = (formData) => {
		this.setState({ isAuthInProgress: true, busyMsg: "Verifying Credentials..." });
		return doLogin(formData)
			.then(result => {
				this.setState({ user: result.user, jwt: result.jwt, isAuthInProgress: false });
			})
			.catch(ex => {
				this.setState({ user: null, jwt: null, isAuthInProgress: false });
				if (ex.response && ex.response.data.error)
					ex.message = ex.response.data.error.message;	// show any payload the server might have returned
				throw ex; // let the loginUI handle it
			});
	}

	refreshUserDetails(jwt) {
		return fetchUserDetails(jwt).then(result => {
			this.safeSetState({ user: result.user, jwt: result.jwt, isAuthInProgress: false });
			}).catch(error => {
				//Nothing to do here. Axios interceptors would have already called logout in case of unAuth
			});
	}

	safeSetState(changedState) {
		return this._isMounted ? this.setState(changedState) : Object.assign(this.state, changedState);
	}

	logout = () => {
		if (this.state.jwt) {
			doLogout(this.state.jwt).catch(console.warn);
			this.setState({ jwt: null, isAuthInProgress: false }, this._saveSession);
		}
		else // probably called from constructor due to invalid local storage data
			this.safeSetState({ user:null, jwt: null, isAuthInProgress: false });
	}
}

export default Main;
