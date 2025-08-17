/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import gEventLog from '../../globals/log';
import {
	subscribeToEvNotifyWarning,
	unSubscribeToEvNotifyWarning,
	subscribeToEvNotifyError,
	unSubscribeToEvNotifyError,
} from '../../globals';

class Notify extends React.PureComponent {

	componentDidMount() {
		subscribeToEvNotifyError(this.onNotification);
		subscribeToEvNotifyWarning(this.onNotification);
	}
	componentWillUnmount() {
		unSubscribeToEvNotifyError(this.onNotification);
		unSubscribeToEvNotifyWarning(this.onNotification);
	}

	render() {
		return (<>
			<h2>Notification Log</h2>
			<ul> {
				gEventLog.map((obj, index) => (<li key={index}>[{obj.t.toLocaleString()}] {obj.title}: {obj.message}</li>))
			} </ul>
			</>
		);
	}

	onNotification = () => this.forceUpdate()

};

export default Notify;