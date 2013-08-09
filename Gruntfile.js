module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        jshint: {
            all: ['Gruntfilejs', 'lib/**/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        watch: {
            options: {
                nospawn: false
            },
            js: {
                files:['lib/**/*.js'],
                tasks: ['jshint']
            }
        }
    });


    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-watch");
    
    grunt.registerTask("default", ["jshint"]);
};

