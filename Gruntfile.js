module.exports = function (grunt) {
    'use strict';

    // Load Npm tasks automagically.
    require('load-grunt-tasks')(grunt);

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jsdoc: {
            dist: {
                src: [
                    'addon/**/*.js',
                    'ADC-README.md'
                ],
                options: {
                    destination: 'docs',
                    template: 'node_modules/@adc/ink-docstrap/template',
                    configure: 'jsdoc.conf.json'
                }
            }
        },
    });

    // Default task(s).
    grunt.registerTask('default', ['jsdoc']);

};