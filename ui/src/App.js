/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { saveSession, clearSession, closeYDB } from './globals/store';
import Axios from 'axios'; // TODO: remove this to reduce bundle size for loginUI
import debounce from 'lodash/debounce';
import { subscribeToEvLogout, unSubscribeToEvLogout } from './globals/eventBus';
import { getMatchingRoute, decodeJWT } from './globals/utils';
import './main.css';

const LoginUI = React.lazy(() => import(/* webpackChunkName: "loginUI", webpackPrefetch: true */ './components/Login/loginUI'));
const Dashboard = React.lazy(() => import(/* webpackChunkName: "dashboard", webpackPrefetch: true */ './components/Dashboard/dashboard'));


class Main extends React.Component {

	constructor(props) {
		super(props);
		this._isMounted = false;
		
		this.state = {
			user: null,
			jwt: null,
			isAuthInProgress: true,
			busyMsg: "Loading previous sessions, if any...",

			_debouncedSave: debounce(() => {
				console.log("saving state");
				// save the session details to local storage
				saveSession({ user: this.state.user, jwt: this.state.jwt });
			}, 1500)
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
			props.lastSession.then(session => { console.log("last session is ready")
				// if no old session exists, nothing to do
				if (!session) return this.safeSetState({ isAuthInProgress: false });
				const { jwt, user } = session;
				// check if the token is readable and not yet expired
				if (!jwt || !user) return this.logout();
				const payload = decodeJWT(jwt);
				if (!payload || payload.email !== user.email)
					return this.logout();
				// trigger the dashboard UI loading, by setting the user
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
		return this.state.user ?
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
		return Axios.post(`http://localhost:8080/api/${formData.mode.toLowerCase()}`, formData)
			.then(response => {
				this.setState({ user: response.data.user, jwt: response.data.jwt, isAuthInProgress: false });
			})
			.catch(ex => {
				this.setState({ user: null, jwt: null, isAuthInProgress: false });
				if (ex.response && ex.response.data.error)
					ex.message = ex.response.data.error.message;	// show any payload the server might have returned
				throw ex; // let the loginUI handle it
			});
	}

	refreshUserDetails(jwt) {
		return Axios.get('http://localhost:8080/api/user', { headers: { Authorization: "Bearer " + jwt } }).then(res => {
			this.safeSetState({ user: res.data.user, jwt: res.data.jwt, isAuthInProgress: false });
		}).catch(error => {
			 // do not clear the user, probably server is offline
			this.safeSetState({ isAuthInProgress: false });
			// if server responded and declared the request as unauthorized, clear the user (triggers the LoginUI)
			if (error.response && (error.response.status === 401 || error.response.status === 403))
				this.safeSetState({ user: null, jwt: null }); 
		});
	}

	safeSetState(changedState) {
		return this._isMounted ? this.setState(changedState) : Object.assign(this.state, changedState);
	}

	logout = () => {
		if (this.state.jwt)
			Axios.get('http://localhost:8080/api/logout', { headers: { Authorization: "Bearer " + this.state.jwt } });
		this.setState({ user: null, jwt: null, isAuthInProgress: false }, clearSession);
	}
}

export default Main;
