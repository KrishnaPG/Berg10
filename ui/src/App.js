import React, { Suspense }  from 'react';
import Axios from 'axios';  //TODO: use window.fetch

const LoginUI = React.lazy(() => import(/* webpackChunkName: "loginUI", webpackPreload: true */ './components/loginUI'));
const Dashboard = React.lazy(() => import(/* webpackChunkName: "dashboard", webpackPrefetch: true */ './components/dashboard'));

class Main extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      user: null,
      isAuthInProgress: true
    };
    this.validateCookie();
  }

  componentDidMount() { }
  componentWillUnmount() { }

  render() {
    return this.state.user ?
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
    return Axios.post('http://localhost:8080/api/login', formData)
      .then(response => {
        console.log("response: ", response);
        this.setState({ user: "dingbat", isAuthInProgress: false });
      })
      .catch(ex => {
        console.log("login exception: ", ex);
        this.setState({ user: null, isAuthInProgress: false });
        throw ex; // let the loginUI handle it
      });
  }

  validateCookie() {
    //this.setState({ isAuthInProgress: true });
    // try retrieving user details from the server. The cookies will be automatically
    // picked up by the `withCredentials=true` property. If cookie is not valid, then
    // server will reject us.
    return Axios.get('http://localhost:8080/api/user', { withCredentials: true }).then(res => {
      this.setState({ user: res.data.user, isAuthInProgress: false });
    }).catch(() => this.setState({ user: null, isAuthInProgress: false }));
  }  
}

export default Main;
