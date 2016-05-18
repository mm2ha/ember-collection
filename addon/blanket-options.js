/* globals blanket, module */

var options = {
    modulePrefix: 'ember-collection',
    filter: '//.*ember-collection/.*/',
    antifilter: '//.*(tests|template).*/',
    loaderExclusions: [],
    enableCoverage: true,
    enableBranches: true,
    cliOptions: {
        reporters: ['html'],
        autostart: true,
        jsonOptions: {
            outputFile: 'test-coverage.json'
        },
        htmlOptions: {
            outputFile: 'test-coverage.html'
        }
    }
};
if (typeof exports === 'undefined') {
    blanket.options(options);
} else {
    module.exports = options;
}
