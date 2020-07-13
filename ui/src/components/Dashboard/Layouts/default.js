/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */

export default {
	"global": {
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
					},
					{
						"type": "tab",
						"name": "Custom Tab",
						"component": "grid",
						"id": "custom-tab"
					}
				]
			},
			{
				"type": "tabset",
				"weight": 25,
				"children": [
					{
						"type": "tab",
						"name": "FI",
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
			"children": [
				{
					"type": "tab",
					"enableClose": false,
					"name": "Options",
					"component": "grid"
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