import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { lastSession } from './globals/store';
import * as serviceWorker from './serviceWorker';

const App = React.lazy(() => import(/* webpackChunkName: "App", webpackPreload: true */ './App'));

ReactDOM.render(
  <Suspense fallback={<div className="LoadingMsg">Initializing the application...</div>}>
    <App lastSession={lastSession} />
  </Suspense>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
