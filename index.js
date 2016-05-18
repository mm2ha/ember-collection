/* jshint node: true */
'use strict';

module.exports = {
    name: 'ember-collection',

    // This is necessary for SASS compilation
    included: function (app, parentAddon) {
        this._super.included.apply(this, arguments);
    }
};
