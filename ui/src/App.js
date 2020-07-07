import React, { Suspense }  from 'react';
import Axios from 'axios';  //TODO: use window.fetch

const LoginUI = React.lazy(() => import(/* webpackChunkName: "loginUI", webpackPreload: true */ './components/loginUI'));
const Dashboard = React.lazy(() => import(/* webpackChunkName: "dashboard", webpackPrefetch: true */ './components/dashboard'));

class Main extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      user: null,
      isAuthInProgress: false
    };
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
}

export default Main;
