<template>
	<nav class="navbar is-light">
		<div class="container">
			<div class="navbar-brand">
				<nuxt-link class="navbar-item" to="/">Nuxt Auth</nuxt-link>
				<button class="button navbar-burger">
					<span></span>
					<span></span>
					<span></span>
				</button>
			</div>
			<div class="navbar-menu">
				<div class="navbar-end">
					<div class="navbar-item" v-if="isAuthInProgress">verifying</div>
					<nuxt-link class="navbar-item" to="/login#to=/profile?where='somewhere'">Log In</nuxt-link>
					<div class="navbar-item has-dropdown is-hoverable" v-if="isAuthenticated"> Authenticated
						<a class="navbar-link">
							{{ loggedInUser.username }}
						</a>
						<div class="navbar-dropdown">
							<nuxt-link class="navbar-item" to="/profile">My Profile</nuxt-link>
							<hr class="navbar-divider">
							<a class="navbar-item" @click="logout">Logout</a>
						</div>
					</div>
					<template v-else>
						<nuxt-link class="navbar-item" to="/register">Register</nuxt-link>
						<nuxt-link class="navbar-item" to="/login">Log In</nuxt-link>
					</template>
				</div>
			</div>
		</div>
	</nav>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['isAuthenticated', 'loggedInUser', 'isAuthInProgress'])
	},
	methods: {
		...mapActions([
			'logout'	// maps `this.logout()` to `this.$store.dispatch('logout')`
		])
	}	
}
</script>

<style scoped>
.navbar {
	max-height: 100px;
}
</style>