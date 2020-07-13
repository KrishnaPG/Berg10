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
						"component": "grid"
					}
				]
			}
		]
	},
	"borders": [
		{
			"type": "border",
			"location": "left",
			"size": 300,
			"children": [
				{
					"type": "tab",
					"enableClose": false,
					"name": "Navigation",
					"component": "grid"
				}
			]
		},
		{
			"type": "border",
			"location": "right",
			"selected": 0,
			"size": 300,
			"children": [
				{
					"type": "tab",
					"enableClose": false,
					"name": "Options",
					"component": "treeExplorer"
				}
			]
		},
		{
			"type": "border",
			"location": "bottom",
			"children": [
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
		}
	]
};