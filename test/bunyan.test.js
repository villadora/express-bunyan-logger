var express = require('express');
var assert = require('assert');
var request = require('supertest');
var through = require('through2');
var bunyanLogger = require('../');


require('buffer');


function st(end) {
  return through(function (chunk, enc, next) {
    if(this.content)
      this.content = Buffer.concat([content, chunk]);
    else 
      this.content = chunk;
    next();
  }, end);
}


describe('bunyan-logger', function() {
  it('test logger', function(done) {
    var app = express();
    var output = st();


    app.use(bunyanLogger({
      stream: output
    }));
    
    app.get('/', function(req, res) {
      res.send('GET /');
    });

    request(app)
      .get('/')
      .expect('GET /', function(err, res) {
        if(err) 
          done(err);
        else {
          var json = JSON.parse(output.content.toString());
          assert.equal(json.name, 'express');
          assert.equal(json.url, '/');
          assert.equal(json['status-code'], 200);
          assert(json.res && json.req);
          done();
        }
      });
  });

  it('test 404 statusCode', function(done) {
    var app = express();
    var output = st();
    app.use(bunyanLogger({
      stream: output
    }));
    
    request(app)
      .get('/missing')
      .end(function(err, res) {
        var json = JSON.parse(output.content.toString());
        assert.equal(json.name, 'express');
        assert.equal(json.url, '/missing');
        assert.equal(json['status-code'], 404);
        assert(json.res && json.req);

        done();
      });
  });

  it.only('test errorLogger', function(done) {
    var app = express();
    var output = st();
    app.use(app.router);
    app.use(bunyanLogger.errorLogger({
      stream: output
    }));

    app.get('/', function(req, res) {
      throw new Error();
    });

    request(app)
      .get('/')
      .end(function(err, res) {
        var json = JSON.parse(output.content.toString());
        assert.equal(json.name, 'express');
        assert.equal(json.url, '/');
        console.log(json);
        assert.equal(json['status-code'], 500);
        assert(json.res && json.req && json.err);
        
        done();
      });
  });

  it('errorLogger should call next error middleware', function(done) {
    var middlewareCalled = false;
    var app = express();
    app.use(app.router);
    app.use(bunyanLogger.errorLogger());
    app.use(function (err, req, res, next) {
      middlewareCalled = true;
      next(err);
    });

    app.get('/', function(req, res) {
      throw new Error();
    });

    request(app)
      .get('/')
      .expect(function () {
        if (!middlewareCalled) {
          throw new Error('middleware was not called');
        }
      })
      .end(done);
  });
});


