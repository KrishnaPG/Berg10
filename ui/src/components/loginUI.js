import React from 'react';
import { message as Message, Button, Form, Input, Row, Col, Spin } from 'antd';
import { GoogleOutlined, LinkedinOutlined, GithubOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import './loginUI.scss';

class LoginUI extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			currentMode: "Login",
			otherMode: "Signup",
			storeLoaded: true, // for future in case LocalStorage is used
			returnTo: encodeURI(window.location.origin + window.location.pathname + window.location.search) // remove the hash in the current url. 
		};
		// configure the error message display options
		Message.config({ maxCount: 2, duration: 2 });
	}

	render() {
		const isBusy = this.props.isAuthInProgress || !this.state.storeLoaded;
		const busyMsg = this.state.storeLoaded ? "Verifying..." : "Initializing store...";

		let oAuthLinks = null;
		if (this.state.currentMode === "Login") {
			oAuthLinks =
				<div className="icons-list">
					<span>Login with:</span>
					<a href={`http://localhost:8080/auth/linkedin?redirect=${this.state.returnTo}`} title="LinkedIn"><LinkedinOutlined className="oAuthIcon" /></a>
					<a href={`http://localhost:8080/auth/google?redirect=${this.state.returnTo}`} title="Google"><GoogleOutlined className="oAuthIcon" /></a>
					<a href={`http://localhost:8080/auth/github?redirect='${this.state.returnTo}'`} title="Github"><GithubOutlined className="oAuthIcon" /></a>
				</div>
		}

		let RepeatPassword = null;
		if (this.state.currentMode === 'Signup') {
			RepeatPassword = <Form.Item
				name="password2"
				rules={[{ required: true, message: 'Please repeat the Password!' }]}
			>
				<Input
					prefix={<LockOutlined className="site-form-item-icon" />}
					type="password"
					placeholder="Password"
				/>
			</Form.Item>
		}

		return (
			<Row id="loginUI" type="flex" justify="center" align="middle" className="fullHeight">
				<Col md={{ span: 12 }} lg={{ span: 5 }}>
					<div className="logo"><span className="logo-lg"><b>Berg</b>10</span></div>
					<Spin spinning={isBusy} tip={busyMsg} delay="250" size="large">
						<Form
							id="loginForm"
							className="login-form"
							initialValues={{ remember: true }}
							onFinish={this.handleSubmit}
						>
							<Form.Item
								name="username"
								rules={[{ required: true, message: 'Please input your Username!' }]}
							>
								<Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="Username" />
							</Form.Item>
							<Form.Item
								name="password"
								rules={[{ required: true, message: 'Please input your Password!' }]}
							>
								<Input
									prefix={<LockOutlined className="site-form-item-icon" />}
									type="password"
									placeholder="Password"
								/>
							</Form.Item>
							{RepeatPassword}
							<Form.Item>
								<Button type="primary" htmlType="submit" className="login-form-button">
									{this.state.currentMode}
								</Button>
							</Form.Item>
						</Form>
						<br />
						{oAuthLinks}
						<br />
						<div className="additional-links">
							<a href="/" onClick={e => { e.preventDefault(); } }>Forgot Password?</a>
							<a href="/" onClick={this.onModeChange}>{this.state.otherMode}</a>
						</div>
					</Spin>
				</Col>
			</Row>
		);
	}

	handleSubmit = (values) => {
		// form must have done the basic validation. Lets do any additional validations
		if (this.state.currentMode === "Signup" && values.password !== values.password1) {
			Message.warning("Password was not repeated correctly");
			return;
		}
		// on success hides the login UI (by setting the user in the state)
		this.props.onFormSubmit({ strategy: 'local', email: values.email, password: values.password }).catch(ex => {
			Message.warning(ex.message || ex);
		});
	}

	onModeChange = (e) => {
		e.preventDefault();
		this.setState((state, _props) => ({ currentMode: state.otherMode, otherMode: state.currentMode }));
		return false;
	}
};

export default LoginUI;