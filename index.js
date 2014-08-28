var bunyan = require('bunyan'),
    useragent = require('useragent'),
    util = require('util'),
    uuid = require('node-uuid');


module.exports = function (opts) {
    var logger = module.exports.errorLogger(opts);
    return function (req, res, next) {
        logger(null, req, res, next);
    };
};


module.exports.childLogger = function (opts) {
  return function(req, res, next) {
    var app = req.app || res.app;
    var logger = createLogger(app, opts);
    var reqId = uuid.v1();
    req.log = logger.child({req_id: reqId});
    next();
  };
};


module.exports.errorLogger = function (opts) {
    var logger, opts = opts || {}, format,
        immediate = false,
        parseUA = true,
        excludes,
        levelFn = defaultLevelFn;

    if (opts.logger) {
      logger = opts.logger;
    }

    // default format
    format = opts.format || ":remote-address :incoming :method :url HTTP/:http-version :status-code :res-headers[content-length] :referer :user-agent[family] :user-agent[major].:user-agent[minor] :user-agent[os] :response-time ms";
    delete opts.format; // don't pass it to bunyan
    (typeof format != 'function') && (format = compile(format));

    opts.hasOwnProperty('parseUA') && (parseUA = opts.parseUA, delete opts.parseUA);

    if (opts.immediate) {
        immediate = opts.immediate;
        delete opts.immediate;
    }

    if (opts.levelFn) {
        levelFn = opts.levelFn;
        delete opts.levelFn;
    }

    if (opts.excludes) {
        excludes = opts.excludes;
        delete opts.excludes;
    }

    return function (err, req, res, next) {
        var startTime = Date.now();

        function logging(incoming) {
            if (!incoming) {
                res.removeListener('finish', logging);
                res.removeListener('close', logging);
            }

            var app = req.app || res.app,
                status = res.statusCode,
                method = req.method,
                url = (req.baseUrl || '') + (req.url || '-'),
                referer = req.header('referer') || req.header('referrer') || '-',
                ua = parseUA ? useragent.parse(req.header('user-agent')) : req.header('user-agent'),
                httpVersion = req.httpVersionMajor + '.' + req.httpVersionMinor,
                responseTime = Date.now() - startTime,
                ip, logFn;


            if (!logger) {
                logger = createLogger(app, opts);
            }


            var level = levelFn(status, err);
            logFn = logger[level] ? logger[level] : logger.info;

            ip = ip || req.ip || req.connection.remoteAddress ||
                (req.socket && req.socket.remoteAddress) ||
                (req.socket.socket && req.socket.socket.remoteAddresss) ||
                '127.0.0.1';

            var meta = {
                'remote-address': ip,
                'ip': ip,
                'method': method,
                'url': url,
                'referer': referer,
                'user-agent': ua,
                'body': req.body,
                'short-body': util.inspect(req.body).substring(0, 20),
                'http-version': httpVersion,
                'response-time': responseTime,
                "status-code": status,
                'req-headers': req.headers,
                'res-headers': res._headers,
                'req': req,
                'res': res,
                'incoming':incoming?'-->':'<--'
            };

            err && (meta.err = err);

            var json = meta;
            if (excludes) {
                json = null;
                if (!~excludes.indexOf('*')) {
                    json = {};
                    var exs = {};
                    excludes.forEach(function(ex) {
                        exs[ex] = true;
                    });

                    for (var p in meta)
                        if (!exs[p])
                          json[p] = meta[p];
                }
            }

            if (!json) {
                logFn.call(logger, format(meta));
            } else {
                logFn.call(logger, json, format(meta));
            }
        }


        if (immediate) {
            logging(true);
        }

        res.on('finish', logging);
        res.on('close', logging);


        next(err);
    };
};


function createLogger(app, opts) {
  opts.name = (opts.name || app.settings.shortname || app.settings.name || app.settings.title || 'express');
  opts.serializers = opts.serializers || {};
  opts.serializers.req = opts.serializers.req || bunyan.stdSerializers.req;
  opts.serializers.res = opts.serializers.res || bunyan.stdSerializers.res;
  opts.serializers.err = opts.serializers.err || bunyan.stdSerializers.err;
  return bunyan.createLogger(opts);
}

function compile(fmt) {
    fmt = fmt.replace(/"/g, '\\"');
    var js = '  return "' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function (_, name, arg) {
        if (arg)
            return '"\n + (meta["' + name + '"] ? (meta["' + name + '"]["' + arg + '"]|| (typeof meta["' + name + '"]["' + arg + '"] === "number"?"0": "-")) : "-") + "';
        return '"\n    + ((meta["' + name + '"]) || (typeof meta["'+name+'"] === "number"?"0": "-")) + "';
    }) + '";';
    return new Function('meta', js);
}


function defaultLevelFn(status, err) {
    if (err || status >= 500) { // server internal error or error
        return "error";
    } else if (status >= 400) { // client error
        return "warn";
    }
    return "info";
}
