/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

export default {
	"global": {
		"splitterSize": 6,
		"tabEnableFloat": true
	},
	"layout": {
		"type": "row",
		"children": [
			{
				"type": "tabset",
				"weight": 12.5,
				"active": true,
				"children": [
					{
						"type": "tab",
						"name": "FX",
						"component": "test"
					}
				]
			}
		]
	},
	"borders": [
		{
			"type": "border",
			"location": "bottom",
			"children": [
				{
					"type": "tab",
					"enableClose": false,
					"name": "Notifications",
					"component": "Notifications"
				},				
				{
					"type": "tab",
					"enableClose": false,
					"name": "Activity Blotter",
					"component": "grid"
				},
				{
					"type": "tab",
					"enableClose": false,
					"name": "Execution Blotter",
					"component": "grid"
				}
			]
		},		
		{
			"type": "border",
			"location": "left",
			"selected": 1,
			"size": 280,
			"children": [
				{
					"type": "tab",
					"enableClose": false,
					"enableFloat": false,
					"name": "Home",
					"component": "Home"
				},				
				{
					"type": "tab",
					"enableClose": false,
					"enableFloat": false,
					"name": "Xplore",
					"component": "Xplore"
				}
			]
		},
		{
			"type": "border",
			"location": "right",
			"selected": -1,
			"size": 300,
			"children": [
				{
					"type": "tab",
					"enableClose": false,
					"name": "Settings",
					"component": "Settings"
				},
				{
					"type": "tab",
					"enableClose": false,
					"name": "Properties",
					"component": "Properties"
				}
			]
		}
	]
};