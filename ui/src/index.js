import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';
import { idbP, lastSession } from './components/store';

const App = React.lazy(() => import(/* webpackChunkName: "App", webpackPreload: true */ './App'));

ReactDOM.render(
  <Suspense fallback={<div class="LoadingMsg">Initializing the application...</div>}>
    <App idbP={idbP} lastSession={lastSession} />
  </Suspense>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
