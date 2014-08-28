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

  it('test excludes', function(done) {
    var app = express();
    var output = st();
    app.use(bunyanLogger({
      stream: output,
      excludes: ['req', 'res', 'nont']
    }));

    app.get('/', function(req, res) {
      res.send('GET /');
    });

    request(app)
      .get('/')
      .expect('GET /', function(err, res) {
        var json = JSON.parse(output.content.toString());
        assert.equal(json.name, 'express');
        assert.equal(json.url, '/');
        assert.equal(json['status-code'], 200);
        assert(!json.res);
        assert(!json.req);

        done();
      });
  });


  it('test excludes all', function(done) {
    var app = express();
    var output = st();
    app.use(bunyanLogger({
      stream: output,
      excludes: ['req', '*']
    }));

    app.get('/', function(req, res) {
      res.send('GET /');
    });

    request(app)
      .get('/')
      .expect('GET /', function(err, res) {
        var json = JSON.parse(output.content.toString());
        assert.equal(json.name, 'express');
        console.log(json);
        assert(!json.url);
        assert(!json['status-code']);
        assert(!json.res);
        assert(!json.req);

        done();
      });
  });

  it('test errorLogger', function(done) {
    var app = express();
    var output = st();
    app.get('/', function(req, res) {
      throw new Error();
    });

    app.use(bunyanLogger.errorLogger({
      stream: output
    }));

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

    app.get('/', function(req, res) {
      throw new Error();
    });

    app.use(bunyanLogger.errorLogger());
    app.use(function (err, req, res, next) {
      middlewareCalled = true;
      next(err);
    });


    request(app)
      .get('/')
      .end(function () {
        if (!middlewareCalled) {
          throw new Error('middleware was not called');
        }
        done();
      });
  });

  it('test childLogger', function(done) {
    var app = express();
    var output = st();

    app.use(bunyanLogger.childLogger({stream: output}));

    app.get('/', function(req, res) {
      req.log.info('test message');
      res.send('GET /');
    });

    request(app)
      .get('/')
      .expect('GET /', function(err, res) {
        if(err)
          done(err);
        else {
          var json = JSON.parse(output.content.toString());
          console.log(json);
          assert.ok(json.req_id);
          assert.equal(json.msg, 'test message');
          assert.equal(json.level, 30);
          done();
        }
      });
  });
});


