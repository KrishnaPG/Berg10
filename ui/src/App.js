/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import Axios from 'axios'; 
import { getMatchingRoute } from './components/utils';

const LoginUI = React.lazy(() => import(/* webpackChunkName: "loginUI", webpackPreload: true */ './components/Login/loginUI'));
const Dashboard = React.lazy(() => import(/* webpackChunkName: "dashboard", webpackPrefetch: true */ './components/dashboard'));

class Main extends React.Component {

	constructor(props) {
		super(props);
		this._isMounted = false;
		
		this.state = {
			user: null,
			isAuthInProgress: true
		};
		
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

		// check if we have a pre-existing cookie and if so validate it
		this.validateCookie();
	}

	componentDidMount() { this._isMounted = true; }
	componentWillUnmount() { this._isMounted = false; }

	render() {
		return this.props.user ?
			(<Suspense fallback={<div>Loading...</div>}><Dashboard /></Suspense>) :
			(<Suspense fallback={<div>Loading...</div>}>
				<LoginUI
					isAuthInProgress={this.state.isAuthInProgress}
					onFormSubmit={this.onLoginFormSubmit}
				></LoginUI>
			</Suspense>);
	}

	onLoginFormSubmit = (formData) => {
		this.setState({ isAuthInProgress: true });
		return Axios.post(`http://localhost:8080/api/${formData.mode.toLowerCase()}`, formData)
			.then(response => {
				console.log("response: ", response);
				this.setState({ user: response.data.user, isAuthInProgress: false });
			})
			.catch(ex => {
				this.setState({ user: null, isAuthInProgress: false });
				if (ex.response && ex.response.data.error)
					ex.message = ex.response.data.error.message;	// show any payload the server might have returned
				throw ex; // let the loginUI handle it
			});
	}

	validateCookie() {
		// try retrieving user details from the server. The cookies will be automatically
		// picked up by the `withCredentials=true` property. If cookie is not valid, then
		// server will reject us.
		return Axios.get('http://localhost:8080/api/user', { withCredentials: true }).then(res => {
			this.safeSetState({ user: res.data.user, isAuthInProgress: false });
		}).catch(() => this.safeSetState({ user: null, isAuthInProgress: false }));
	}

	safeSetState(changedState) {
		return this._isMounted ? this.setState(changedState) : Object.assign(this.state, changedState);
	}

	logout() {
		this.setState({ user: null });
		return Axios.get('http://localhost:8080/api/logout', { withCredentials: true });
	}
}

export default Main;
