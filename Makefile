test: jshint
	@./node_modules/.bin/mocha -R spec

jshint:
	@./node_modules/.bin/jshint Gruntfile.js index.js test/*.js

.PHONY: jshint test
