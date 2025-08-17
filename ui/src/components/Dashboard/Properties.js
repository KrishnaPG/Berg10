/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';
import gSettings from '../../globals/settings';

class Properties extends React.PureComponent {
	
	render() {

		return (<>
			<h2>Properties</h2>
			<ul>
				{
					Object.keys(gSettings).map((name, index) => (<li key={index}>{name}</li>))
				}
			</ul>
		</>
		);
	}

	onNotification = () => this.forceUpdate()

};

export default Properties;