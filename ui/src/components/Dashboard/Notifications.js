/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import { subscribeToEvNotifyError, unSubscribeToEvNotifyError, subscribeToEvNotifyWarning, unSubscribeToEvNotifyWarning } from '../../globals/eventBus';

class Notify extends React.Component {

	constructor(props) {
		super(props);
		this.state = {};

	}

	componentDidMount() {
	}
	componentWillUnmount() {
	}

	render() {
		return (
			<h1>Notify</h1>
		);
	}


};

export default Notify;