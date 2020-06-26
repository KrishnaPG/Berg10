/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import Axios from 'axios';

export const state = () => ({
	user: null,
	authInProgress: false
});

export const getters = {
	isAuthenticated(state) {
		return state.user;
	},

	loggedInUser(state) {
		return state.user;
	},

	isAuthInProgress(state) {
		return state.authInProgress;
	}
};

// Do not use mutations directly (use actions to commit anything to the store)
export const mutations = {
	SET_USER(store, data) {
		store.user = data;
	},
	SET_PROGRESS(store, progress) {
		store.authInProgress = progress;
	}
};

export const actions = {
	validateCookie({ commit }) {
		commit('SET_PROGRESS', true);
		// try retrieving user details from the server. The cookies will be automatically
		// picked up by the `withCredentials=true` property. If cookie is not valid, then
		// server will reject us.
		return Axios.get('http://localhost:8080/api/user', { withCredentials: true }).then(res => {
			commit('SET_USER', res.data.user);
		}).finally(() => commit('SET_PROGRESS', false));
	},
	logout({ commit }) {
		commit('SET_USER', null);
		return Axios.get('http://localhost:8080/api/logout', { withCredentials: true });
	},
	login({ commit }, formData) {
		commit('SET_PROGRESS', true);
		return Axios.post('http://localhost:8080/api/login', formData)
			.then(response => console.log("response: ", response))
			.catch(ex => {
				console.log("login exception: ", ex);
				commit('SET_USER', null);
				commit('SET_PROGRESS', false);
			});
	}
};