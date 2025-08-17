/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';

class Barrier extends React.Component {
	shouldComponentUpdate(nextProps, nextState) {
		return this.props.lastModified !== nextProps.lastModified;
	}
	render() {
		return <>{this.props.children}</>;
	}
};

export default Barrier;