/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';

class ReactAsyncComponent extends React.Component {
	constructor(props) {
		super(props);
		this._isMounted = false;
	}
	componentDidMount() {
		this._isMounted = true;
		console.log("ReactAsyncComponent::componentDidMount");
	}
	componentWillUnmount() {
		console.log("ReactAsyncComponent::componentWillUnmount");
		this._isMounted = false;
	}
	safeSetState(changedState) {
		return this._isMounted ? this.setState(changedState) : Object.assign(this.state, changedState);
	}	
};

export default ReactAsyncComponent;