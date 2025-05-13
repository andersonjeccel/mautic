'use strict';

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Define the configuration for all the tasks
    grunt.initConfig({

        // mautic assets dir path
        mautic: {
            // configurable paths
            bundleAssets: 'app/bundles/**/Assets/css',
            pluginAssets: 'plugins/**/Assets/css',
            rootAssets: 'media/css'
        },

        // Watches files for changes and runs tasks based on the changed files
        watch: {
            sass: {
                files: ['<%= mautic.bundleAssets %>/**/*.scss', '<%= mautic.bundleAssets %>/../builder/*.scss'],
                tasks: ['sass']
            }
        },

        // Compiles scss files in bundle's Assets/css root and single level directory to CSS
        sass: {
            files: {
                src: ['<%= mautic.bundleAssets %>/*.scss', '<%= mautic.pluginAssets %>/*.scss', '<%= mautic.bundleAssets %>/*/*.scss', '<%= mautic.bundleAssets %>/../builder/*.scss'],
                expand: true,
                rename: function (dest, src) {
                    return dest + src.replace('.scss', '.css')
                },
                dest: ''
            },
            options: {
                implementation: require('sass'),
                sourceMap: true
            }
        }
    });

    grunt.registerTask('compile-sass', [
        'sass',
        'watch'
    ]);
};
