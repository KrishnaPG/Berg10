<template>
	<center>
		<ASpin :spinning="isAuthInProgress"  tip="Verifying..." :delay="250" size="large">
			<div class="error">{{errorMsg}}</div>
			<AForm id="loginForm" :form="form" @submit="handleSubmit">
				<AFormItem>
					<AInput 
						v-decorator="[
							'userName',
							{ rules: [{ required: true, message: 'Please input your username!' }] },
						]"
						placeholder="Username"
					>
						<AIcon slot="prefix" type="user" style="color: rgba(0,0,0,.25)" />
					</AInput>
				</AFormItem>
				<AFormItem>
					<AInputPassword
						v-decorator="[
							'password',
							{ rules: [{ required: true, message: 'Please input your Password!' }] },
						]"
						type="password"
						placeholder="Password"
					>
						<AIcon slot="prefix" type="lock" style="color: rgba(0,0,0,.25)" />
					</AInputPassword>
				</AFormItem>
				<AFormItem>
					<AButton type="primary" html-type="submit" class="login-form-button">
						Log in
					</AButton>			
				</AFormItem>
			</AForm>
			<br/>
			<div class="icons-list">
				Login with:
				<a :href="`http://localhost:8080/oauth/google?redirect=${currentPath}`" title="Google"><a-icon type="google" /></a>
				<a :href="`http://localhost:8080/oauth/linkedin?redirect=${currentPath}`" title="LinkedIn"><a-icon type="linkedin"/></a>
				<a :href="`http://localhost:8080/oauth/github?redirect=${currentPath}`" title="Github"><a-icon type="github" /></a>
			</div>	
		</ASpin>
	</center>
</template>

<script>

export default {
	name: 'loginUI',
	props: ["currentPath", "isAuthInProgress"],
	data: function() {
		return {
			errorMsg: "",
			info: ""
		}
	},
	beforeCreate() {
		this.form = this.$form.createForm(this, { name: 'normal_login' });
	},	
	mounted: function() {
		const [oAuthErr] = this.getMatchingRoute(window.location, "oAuthErr");
		if(oAuthErr !== null) {
			this.errorMsg = decodeURIComponent(oAuthErr);
			this.$router.replace({ query: {} });
		}
	},
	methods: {
		handleSubmit: function(e) {
			e.preventDefault();
			this.form.validateFields((err, values) => {
				if(err) return; // some form input validation error, nothing to do
				this.errorMsg = "";
				this.authInProgress = true;
				// on success hides the login UI (by setting the user in the Store)
				this.$store.dispatch('login', {strategy: 'local',	email: values.userName,	password: values.password}).catch(err => {
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
		}	
	}
}
</script>

<style>
#loginForm {
	max-width: 300px;
}
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
.icons-list >>> .anticon {
	margin-right: 16px;
	font-size: 2rem;
	line-height: 2rem;
	vertical-align: middle;
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