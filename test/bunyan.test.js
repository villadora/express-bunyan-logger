var express = require('express');
var assert = require('assert');
var request = require('supertest');
var through = require('through2');
var bunyanLogger = require('../');


require('buffer');


function st(end) {
  return through(function (chunk, enc, next) {
    if(this.content)
      this.content = Buffer.concat([this.content, chunk]);
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

  it('test request id', function(done) {
    var app = express();
    var output = st();
    app.use(bunyanLogger({
      stream: output
    }));

    app.use(function(req, res, next) {
      req.log.info('middleware');
      next();
    });

    app.get('/', function(req, res) {
      res.send('GET /');
    });
    
    request(app)
      .get('/')
      .expect('GET /', function(err, res) {
        var lines = output.content.toString().split('\n');
        assert.equal(lines.length, 3);
        assert.equal(lines[2], '');

        var json = JSON.parse(lines[0]);
        assert.equal(json.name, 'express');
        assert(json.req_id);
        var req_id = json.req_id;
        assert.equal(json.msg, 'middleware');

        json = JSON.parse(lines[1]);
        assert.equal(json.url, '/');
        assert(json.req_id);
        assert.equal(json.req_id, req_id);
        done();
      });
  });


  it('test options.genReqId', function(done) {
    var app = express();
    var output = st();
    var id = 0;
    app.use(bunyanLogger({
      stream: output,
      genReqId: function(req) {
        return id++;
      }
    }));

    app.get('/', function(req, res) {
      res.send('GET /');
    });
    
    request(app)
      .get('/')
      .expect('GET /', function(err, res) {
        var json = JSON.parse(output.content.toString());
        assert.equal(json.name, 'express');
        assert.equal(json.req_id, 0);

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
        assert.equal(json['status-code'], 500);
        assert(json.res && json.req && json.err);
        
        done();
      });
  });

  it('errorLogger should call next error middleware', function(done) {
    var middlewareCalled = false;
    var app = express();
    var output = st();

    app.get('/', function(req, res) {
      throw new Error();
    });

    app.use(bunyanLogger.errorLogger({
      stream: output
    }));

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

  it('test options.includesFn', function (done) {
    var app = express();
    var output = st();
    app.use(bunyanLogger({
      stream: output,
      includesFn: function (req, res) {
        return {
          user: {
            name: 'Eric',
            _id: '546f80240a186fd6181472a9'
          }
        };
      }
    }));

    app.get('/', function (req, res) {
      res.send('GET /');
    });

    request(app)
        .get('/')
        .expect('user property to be present in log', function (err, res) {
          var json = JSON.parse(output.content.toString());
          assert(json.user);
          assert.equal(json.user.name, 'Eric');
          done();
        });
  });

  it('test options.levelFn', function (done) {
    var app = express();
    var output = st();
    app.use(bunyanLogger({
      stream: output,
      levelFn: function (status, err, meta) {
        if (meta && meta['response-time'] !== undefined) {
          return 'fatal';
        }
      }
    }));

    app.get('/', function (req, res) {
      res.send('GET /');
    });

    request(app)
        .get('/')
        .expect('error level fatal', function (err, res) {
          var json = JSON.parse(output.content.toString());
          assert.equal(json.level, 60);
          done();
        });
  });
});


