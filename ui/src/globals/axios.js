/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import ObjMerge from 'lodash/merge';
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
				// Auth Failure (Note: Vault gives incorrect error code 400, when the client-token is missing)
				if (error.response.status === 401) {
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

// handles both login and signup based on formData.mode
export function doLogin(formData) {
	formData.appCtx = "appCtxBerg10";
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
	return loadAxios().then(Axios => Axios.defaults.headers.common['Authorization'] = `Bearer ${token}`);
}

export class AxiosBaseComponent extends React.PureComponent {
	constructor(props) {
		super(props);
		this._isMounted = false;
		this._callTrackers = {};
		this.state = { lastQueryMadeAt: null, pendingCalls: {} }
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
		return this._isMounted ?
			this.setState(state => ObjMerge({}, state, changedState)) :
			ObjMerge(this.state, changedState);
	}
	safeSetStateFn(fn) {
		return this._isMounted ?
			this.setState(state => ObjMerge({}, state, fn(state))) :
			ObjMerge(this.state, fn(this.state));
	}

	isCancel(error) {
		return Axios.isCancel(error);
	}

	makeCall(req, callScope) {
		const tracker = this._callTrackers[callScope];
		if (tracker) {
			// Abort any previous calls that are in-progress. Does nothing if call has already been resolved or rejected.
			tracker.cancel("Aborting old call");
		}
		// trigger ui update.
		this.safeSetStateFn(state => ({ lastQueryMadeAt: performance.now(), pendingCalls: { [callScope]: (state.pendingCalls[callScope] || 0) + 1  }  }));
		// load the axios and make the call
		return loadAxios().then(Axios => {
			const tracker = Axios.CancelToken.source();
			this._callTrackers[callScope] = tracker;
			// make the actual call
			return Axios.request(req, { cancelToken: tracker.token })
				.then(response => response.data.result)
				.catch(/* nothing to do - error is already notified by the axios handler */)
				.finally(() => {
					// trigger ui update to hide any spinners
					this.safeSetStateFn(state => {
						return ({ lastQueryMadeAt: performance.now(), pendingCalls: { [callScope]: Math.max(state.pendingCalls[callScope] - 1, 0) } })
					});
				});
		});
	}

}