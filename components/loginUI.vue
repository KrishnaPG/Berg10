<template>
	<a-row type="flex" justify="center" align="middle" class="fullHeight">
		<a-col :md="{ span: 12 }" :lg="{ span: 5 }">
				<div class="logo"><span class="logo-lg"><b>Berg</b>10</span></div>
		<ASpin :spinning="isBusy" :tip="busyMsg" :delay="250" size="large">
			<div class="error" v-if="errorMsg"> <a-alert type="error" :message="errorMsg" banner closable/> </div>
			<AForm id="loginForm" :form="form" @submit="handleSubmit">
				<AFormItem>
					<AInput 
						v-decorator="[
							'email',
							{ rules: [{ type:'email', required: true, message: 'Please enter your eMail address!' }] },
						]"
						placeholder="EMail"
					>
						<AIcon slot="prefix" type="user" style="color: rgba(0,0,0,.25)" />
					</AInput>
				</AFormItem>
				<AFormItem>
					<AInputPassword
						v-decorator="[
							'password',
							{ rules: [{ required: true, message: 'Please enter the Password!' }] },
						]"
						type="password"
						placeholder="Password"
					>
						<AIcon slot="prefix" type="lock" style="color: rgba(0,0,0,.25)" />
					</AInputPassword>
				</AFormItem>
				<AFormItem v-if="currentMode=='Signup'">
					<AInputPassword
						v-decorator="[
							'password2',
							{ rules: [{ required: true, message: 'Repeat the Password!' }] },
						]"
						type="password"
						placeholder="Password"
					>
						<AIcon slot="prefix" type="lock" style="color: rgba(0,0,0,.25)" />
					</AInputPassword>
				</AFormItem>				
				<AFormItem>
					<AButton type="primary" html-type="submit" class="login-form-button">
						{{currentMode}}
					</AButton>			
				</AFormItem>
			</AForm>
			<br/>
			<div class="icons-list" v-if="currentMode=='Login'">
				<span>Login with:</span>
				<a :href="`http://localhost:8080/auth/google?pubKey=${pubKey}&redirect=${returnTo}`" title="Google"><a-icon type="google" /></a>
				<a :href="`http://localhost:8080/auth/linkedin?pubKey=${pubKey}&redirect=${returnTo}`" title="LinkedIn"><a-icon type="linkedin"/></a>
				<a :href="`http://localhost:8080/auth/github?pubKey=${pubKey}&redirect='${returnTo}'`" title="Github"><a-icon type="github" /></a>
			</div>
			<br/>
			<div class="additional-links">
				<a href="$">Forgot Password?</a>
				<a href="#" @click="onModeChange">{{otherMode}}</a>
			</div>
		</ASpin>
		</a-col>
	</a-row>
</template>

<script>
export default {
	name: 'loginUI',
	props: ["isAuthInProgress", "pubKey"],
	data: function() {
		return {
			errorMsg: null,
			currentMode: "Login",
			storeLoaded: true	// set this to false when using localStorage persistence
		}
	},
	beforeCreate() {
		this.form = this.$form.createForm(this, { name: 'normal_login' });
	},	
	mounted: function() {
		const [oAuthErr] = this.getMatchingRoute(window.location, "oAuthErr");
		if(oAuthErr !== null) {
			this.errorMsg = decodeURIComponent(oAuthErr);
			this.$router.replace({ query: {} }); // removes the hash
		}
		const [token] = this.getMatchingRoute(window.location, "token");
		if(token !== null) {
			this.errorMsg = decodeURIComponent(token);
			this.$router.replace({ query: {} }); // removes the hash
		}
		// // wait till the values are loaded from localStorage into the Store in memory
		// this.$store.restored.then(() => {
		// 	console.log("login store restored: ", this.$store.state);
		// 	this.storeLoaded = true;
		// });
	},
	methods: {
		handleSubmit: function(e) {
			e.preventDefault();
			this.form.validateFields((err, values) => {
				if(err) return; // some form input validation error, nothing to do
				if(this.currentMode === "Signup" && values.password !== values.password1) {
					this.errorMsg = "Password was not repeated correctly";
					return;
				}
				this.errorMsg = null;
				this.authInProgress = true;
				// on success hides the login UI (by setting the user in the Store)
				this.$store.dispatch('login', {strategy: 'local',	email: values.email,	password: values.password}).catch(err => {
					this.errorMsg = err.message + " !!";
				});
			});
		},
		getMatchingRoute: function (location, key) {
			const regex = new RegExp(`(?:&?)${key}=([^&]*)`);
			const match = location.hash ? location.hash.match(regex) : null;
			if (match !== null) {
				const [, value] = match;
				return [value, regex];
			}
			return [null, regex];
		},
		onModeChange: function() {
			this.currentMode = this.otherMode;
			this.errorMsg = null;
		}
	},
	computed: {
		returnTo: function() {			
			return encodeURI(window.location.origin + window.location.pathname + window.location.search); // remove the hash in the current url. 
		},
		isBusy: function() {
			return this.isAuthInProgress || !this.storeLoaded;
		},
		busyMsg: function() {
			return this.storeLoaded ? "Verifying..." : "Initializing store...";
		},
		otherMode: function() {
			return this.currentMode === "Login" ? "Signup": "Login";
		}
	}	
}
</script>

<style>
#loginForm .login-form-forgot {
	float: right;
}
#loginForm .login-form-button {
	width: 100%;
}
.error {
	min-height: 2rem;
	line-height: 2rem;
	color: darkred;
}
</style>
<style scoped>
.icons-list {
	display: flex;
	justify-content: center;
}
.icons-list >>> .anticon {
	font-size: 2rem;
}
.icons-list > * {
	margin-right: 16px;	
	line-height: 2rem;
	vertical-align: middle;	
}
.additional-links {
	display: flex;
	justify-content: space-between;
}
</style>
<style>
.anticon-linkedin {
	color: #007bb5
}
.anticon-google {
	color: #ea4335;
}
</style>
<style scoped>
	.logo {
		background: url('/mini.jpg') no-repeat;
		background-size: cover;
		height: 64px;
		border-radius: 8px;	
		margin-bottom: 2rem;
		display: flex;
		justify-content: center;		
	}
	.logo-lg {
		font-family: 'Poiret One', cursive;
		font-size: 2rem;
		line-height: 64px; /* should be same as the .logo height */
		color:#673AB7 ;
	}
	.logoBackground {
		border-radius: 8px;
		padding: 16px;
		background: url(/base.png);
		background-size: cover;
	}
</style>