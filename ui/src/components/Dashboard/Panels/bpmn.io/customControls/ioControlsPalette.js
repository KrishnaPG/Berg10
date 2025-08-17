/**
 * Ref: https://github.com/bpmn-io/diagram-js/blob/master/example/app/ExamplePaletteProvider.js
 */
import "./ioControlsPalette.scss";

export default function CustomPaletteProvider(eventBus, palette) {
	this._eventBus = eventBus;
	palette.registerProvider(this);
}

CustomPaletteProvider.$inject = [
	'eventBus',
	'palette'
];


CustomPaletteProvider.prototype.getPaletteEntries = function() {
	return {
		'io-controls-separator': {
			group: 'io-controls',
			separator: true
		},
		'io-controls-save': {
			group: 'io-controls',
			className: 'dmn-io-palette-icon-save',
			title: 'Save',
			action: {
				click: event => {
					console.log("event clicked: ", event);
					this._eventBus.fire('io-controls.save', event);
				}
			}
		},
		'io-controls-load': {
			group: 'io-controls',
			className: 'dmn-io-palette-icon-load',
			title: 'Load from file',
			action: {
				click: event => {
					console.log("clicked createframe: ", event);
					this._eventBus.fire('io-controls.load', event);
				}
			}
		}
	};
};