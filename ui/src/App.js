/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import Axios from 'axios'; 
import debounce from 'lodash/debounce';
import { getMatchingRoute, decodeJWT } from './components/utils';
import './main.css';

const LoginUI = React.lazy(() => import(/* webpackChunkName: "loginUI", webpackPreload: true */ './components/Login/loginUI'));
const Dashboard = React.lazy(() => import(/* webpackChunkName: "dashboard", webpackPrefetch: true */ './components/dashboard'));

class Main extends React.Component {

	constructor(props) {
		super(props);
		this._isMounted = false;
		
		this.state = {
			user: null,
			jwt: null,
			isAuthInProgress: true,
			busyMsg: "Loading previous sessions, if any..."
		};

		// check if we have a pre-existing token and if so validate it
		props.lastSession.then(session => {
			if (!session) return this.safeSetState({ isAuthInProgress: false }); // no old session exists
			const { jwt, layout } = session;
			const payload = decodeJWT(jwt);
			console.log("parsed jwt payload: ", payload);
			//1. set the user pointed by jwt (if expiration is not over)
			//2. load the user-specific settings from the storage
			//3. get updated profile data for the user using the jwt from the server
		});

		// check if we received a token on the browser address bar
		const [token] = getMatchingRoute(window.location, "token");
		if (token !== null) {
			console.log("Token: ", decodeURIComponent(token));
			window.history.replaceState("", document.title, window.location.pathname + window.location.search); // removes the hash
			// The token can be used to validate/login the user.
		}
		// Now, we also need to check for oAuth error on the location,
		// but we do it in the LoginUI. We check for the token here
		// because we want to validate the user as early as possible
		// even before we show the LoginUI, preferably.
	}

	componentDidMount() {
		this._isMounted = true;
	}
	componentWillUnmount() {
		this._isMounted = false;
		this.saveStateToLocalStorage();
		this.props.idbP.destroy(); // close it safely
	}
	static getDerivedStateFromProps(props, state) {
		// either props or the state has changed - trigger a session save
		console.log("getDerivedStateFromProps", props, state);
		// saveStateToLocalStorage() {
		// 	// save the session details to local storage
		// 	this.props.idbP.set("lastSession", { user: this.state.user, jwt: this.state.jwt });
		// }
		return null;
	}

	render() {
		return this.state.user ?
			(<Suspense fallback={<div class="LoadingMsg">Creating the Layouts...</div>}><Dashboard /></Suspense>) :
			(<Suspense fallback={<div class="LoadingMsg">Preparing for Login...</div>}>
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
				console.log("response: ", response);
				this.setState({ user: response.data.user, jwt: response.data.jwt, isAuthInProgress: false });
			})
			.catch(ex => {
				this.setState({ user: null, jwt: null, isAuthInProgress: false });
				if (ex.response && ex.response.data.error)
					ex.message = ex.response.data.error.message;	// show any payload the server might have returned
				throw ex; // let the loginUI handle it
			});
	}

	refreshUserDetails() {
		return Axios.get('http://localhost:8090/api/user', { headers: { Authorization: "Bearer " + this.state.jwt } }).then(res => {
			this.safeSetState({ user: res.data.user, jwt: res.data.jwt, isAuthInProgress: false });
		}).catch(() => this.safeSetState({ isAuthInProgress: false })); // do not clear the user, just in case server is offline
	}

	safeSetState(changedState) {
		return this._isMounted ? this.setState(changedState) : Object.assign(this.state, changedState);
	}

	logout() {
		this.setState({ user: null, jwt: null, isAuthInProgress: false });
		this.props.idbP.del("lastSession");
		return Axios.get('http://localhost:8080/api/logout');
	}
}

export default Main;
