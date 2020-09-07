/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import { getServerBaseURL } from './settings';
import { triggerLogout, triggerNotifyError, triggerNotifyWarning } from './triggers';

let Axios = null;

function init() {
	return Promise.all([
		import(/* webpackChunkName: "axiosBase", webpackPrefetch: true */ 'axios'),
		import(/* webpackChunkName: "axiosExt", webpackPrefetch: true */ 'axios-extensions')
	]).then(([AxiosModule, { cacheAdapterEnhancer }]) => {
		Axios = AxiosModule;

		// Create `axios-cache-adapter` instance
		Axios.defaults.baseURL = getServerBaseURL();
		Axios.defaults.adapter = cacheAdapterEnhancer(Axios.defaults.adapter);

		// setup an interceptor to handle any 401 or 403 errors.
		Axios.interceptors.response.use(null, error => {
			if (Axios.isCancel(error))
				return Promise.reject(error);
			
			if (error.response) {
				// Vault gives incorrect error code 400, when the client-token is missing
				if (error.response.status <= 401 && error.response.status >= 400) {
					// TODO: save layout (we may need to show it exactly so that user can resume after login)
					// unAuthenticated user, trigger the logout, which will display the loginUI
					triggerLogout();
				}
				// 403 is unAuthorized. We just have to notify the user that they do not have permission.
				// We do NOT trigger login for the 403 or other errors such as 404
				triggerNotifyError(error.response.data.error || { title: error.response.statusText, message: error.response.data });
			}
			else {
				// some network error, or server did not respond
				triggerNotifyWarning({ title: (error.message || error), message: (error.description || error.config.url) });
			}
			return Promise.reject(error);
		});

		return Axios;
	});
}

// Loads axios on first loadAxios() call. Returns the promise on all subsequent calls.
let _axiosLoadPromise = null;
const _loadAxios_PreInit = () => {
	_axiosLoadPromise = init();
	loadAxios = _loadAxios_PostInit;
	return _axiosLoadPromise;
};
const _loadAxios_PostInit = () => _axiosLoadPromise;
let loadAxios = _loadAxios_PreInit;

export function doLogin(formData) {
	return loadAxios()
		.then(Axios => Axios.post(`user/${formData.mode.toLowerCase()}`, formData))
		.then(response => response.data.result);
}
export function fetchUserDetails(jwt) {
	return loadAxios()
		.then(Axios => Axios.get('user', { headers: { Authorization: "Bearer " + jwt }, cache: false }))
		.then(response => response.data.result);
}
export function doLogout(jwt) {
	return loadAxios()
		.then(Axios => Axios.post('user/logout', { headers: { Authorization: "Bearer " + jwt } }))
		.then(response => response.data.result);
}

export function getAxiosCommonHeaders() {
	return Axios.defaults.headers.common;
}

export function setAxiosAuthBearer(token) {
	loadAxios().then(Axios => Axios.defaults.headers.common['Authorization'] = `Bearer ${token}`);
}

export class AxiosBaseComponent extends React.PureComponent {
	constructor(props) {
		super(props);
		this._isMounted = false;
		this._callTrackers = {};
		this._pendingCalls = {};
		this.state = { lastQueryMadeAt: null }
	}
	componentDidMount() {
		this._isMounted = true;
	}
	componentWillUnmount() {
		// Cancel all pending axios calls.
		Object.values(this._callTrackers).forEach(tracker => tracker.cancel("Component Unmounting"));
		this._isMounted = false;
	}
	safeSetState(changedState) {
		return this._isMounted ? this.setState(changedState) : Object.assign(this.state, changedState);
	}

	isCancel(error) {
		return Axios.isCancel(error);
	}

	getTypeDef() {
		const tracker = this._callTrackers["getTypeDef"];
		if (tracker) {
			// Abort any previous calls that are in-progress. Does nothing if call has already been resolved or rejected.
			tracker.cancel("Aborting old call");
		}
		// trigger ui update.
		this._pendingCalls["getTypeDef"] = (this._pendingCalls["getTypeDef"] || 0) + 1;
		this.setState({ lastQueryMadeAt: performance.now() });
		// load the axios and make the call
		return loadAxios().then(Axios => {
			const tracker = Axios.CancelToken.source();
			this._callTrackers["getTypeDef"] = tracker;
			// make the actual call
			return Axios.get("typedefs?name=schepe", { cancelToken: tracker.token })
				.then(response => response.data.result)
				.finally(() => {
					--this._pendingCalls["getTypeDef"];
					// trigger ui update to hide any spinners
					this.safeSetState({ lastQueryMadeAt: performance.now() });
				});
		});
	}
}