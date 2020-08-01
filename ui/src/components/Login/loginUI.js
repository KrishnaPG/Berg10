/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import { getMatchingRoute } from '../../globals/utils';
import './loginUI.scss';

const Button = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/button/button'));
const Col = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/grid/col'));
const Form = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/form/Form'));
const FormItem = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/form/FormItem'));
const Input = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/input/Input'));
const InputPassword = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/input/Password'));
const Message = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/message/index'));
const Row = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/grid/row'));
const Spin = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/spin/index'));

const GoogleOutlined = React.lazy(() => import(/* webpackChunkName: "loginIcons", webpackPreload: true */ '@ant-design/icons/GoogleOutlined'));
const LinkedinOutlined = React.lazy(() => import(/* webpackChunkName: "loginIcons", webpackPreload: true */ '@ant-design/icons/LinkedinOutlined'));
const GithubOutlined = React.lazy(() => import(/* webpackChunkName: "loginIcons", webpackPreload: true */ '@ant-design/icons/GithubOutlined'));
const MailOutlined = React.lazy(() => import(/* webpackChunkName: "loginIcons", webpackPreload: true */ '@ant-design/icons/MailOutlined'));
const LockOutlined = React.lazy(() => import(/* webpackChunkName: "loginIcons", webpackPreload: true */ '@ant-design/icons/LockOutlined'));


class LoginUI extends React.Component {

	constructor(props) {
		super(props);		
		// configure the error message display options
		// Message.config({ maxCount: 2, duration: 2 });

		// check if we received an oAuth Error result
		const [oAuthErr] = getMatchingRoute(window.location, "Err");
		if (oAuthErr !== null) {
			window.history.replaceState("", document.title, window.location.pathname + window.location.search); // removes the hash
			Message.warning(decodeURIComponent(oAuthErr));
		}

		this.state = {
			currentMode: "Login",
			otherMode: "Signup",
			returnTo: encodeURI(window.location.origin + window.location.pathname + window.location.search) // remove the hash in the current url. 
		};
	}

	render() {

		let oAuthLinks = null;
		if (this.state.currentMode === "Login") {
			oAuthLinks =
				<><div className="icons-list">
					<span>Login with:</span>
					<a href={`http://localhost:8080/auth/linkedin?redirect=${this.state.returnTo}`} title="LinkedIn"><LinkedinOutlined className="oAuthIcon" /></a>
					<a href={`http://localhost:8080/auth/google?redirect=${this.state.returnTo}`} title="Google"><GoogleOutlined className="oAuthIcon" /></a>
					<a href={`http://localhost:8080/auth/github?redirect=${this.state.returnTo}`} title="Github"><GithubOutlined className="oAuthIcon" /></a>	
				</div>
				<br /></>;
		}

		let RepeatPassword = null;
		if (this.state.currentMode === 'Signup') {
			RepeatPassword = <FormItem
				name="confirmPassword"
				rules={[{ required: true, message: 'Please repeat the Password!' }]}
			>
				<InputPassword
					prefix={<LockOutlined className="site-form-item-icon" />}
					placeholder="Password"
					title="Repeat the Password"
				/>
			</FormItem>
		}

		return (
			<Row id="loginUI" type="flex" justify="center" align="middle" className="fullHeight">
				<Col md={{ span: 12 }} lg={{ span: 5 }}>
					<div className="logo"><span className="logo-lg"><b>Berg</b>10</span></div>
					<Spin spinning={this.props.isAuthInProgress} tip={this.props.busyMsg} delay="0" size="large">
						<Form
							id="loginForm"
							className="login-form"
							initialValues={{ remember: true }}
							onFinish={this.handleSubmit}
						>
							<FormItem
								name="email"
								rules={[{ required: true, message: 'Please enter your eMail!' }]}
							>
								<Input prefix={<MailOutlined className="site-form-item-icon" />} placeholder="EMail" title="Enter your EMail"/>
							</FormItem>
							<FormItem
								name="password"
								rules={[{ required: true, message: 'Please input your Password!' }]}
							>
								<InputPassword
									prefix={<LockOutlined className="site-form-item-icon" />}
									placeholder="Password"
									title="Enter the Password"
								/>
							</FormItem>
							{RepeatPassword}
							<FormItem>
								<Button type="primary" htmlType="submit" className="login-form-button">
									{this.state.currentMode}
								</Button>
							</FormItem>
						</Form>
						<br />
						{oAuthLinks}
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
		if (this.state.currentMode === "Signup" && values.password !== values.confirmPassword) {
			Message.warning("Password was not repeated correctly");
			return;
		}
		// on success hides the login UI (by setting the user in the state)
		this.props.onFormSubmit({ mode: this.state.currentMode, ...values }).catch(ex => {
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