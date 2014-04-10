var express = require('express'),
    request = require('supertest'),
    bunyanLogger = require('../');


describe('bunyan-logger', function() {
    it('test logger', function(done) {
        var app = express();
        app.use(bunyanLogger({}));
        
        app.get('/', function(req, res) {
            res.send('GET /');
        });

        request(app)
            .get('/')
            .expect('GET /', function(err, res) {
                if(err) 
                    done(err);
                else
                    done();
            });
    });

    it('test 404 statusCode', function(done) {
        var app = express();
        app.use(bunyanLogger());
        
        request(app)
            .get('/missing')
            .end(function(err, res) {
                done();
            });
    });

    it('test errorLogger', function(done) {
        var app = express();
        app.use(app.router);
        app.use(bunyanLogger.errorLogger());

        app.get('/', function(req, res) {
            throw new Error();
        });

        request(app)
            .get('/')
            .end(function(err, res) {
                done();
            });
    });
});


