var bunyan = require('bunyan'),
    useragent = require('useragent');


module.exports = function(opts) {
    var logger = module.exports.errorLogger(opts);
    return function(req, res, next) {
        logger(null, req, res, next);
    };
};


module.exports.errorLogger = function(opts) {
    var logger, opts = opts || {
        // default format 
        format: ":remote-address - :method :url HTTP/:http-version :status-code :content-length :referer :user-agent[family] :user-agent[major].:user-agent[minor] :user-agent[os]"
    };
    (typeof opts.format != 'function') && (opts.format = compile(opts.format));

    return function(err, req, res, next) {
        function logging() {
            res.removeListener('finish', logging);
            res.removeListener('close', logging);

            var app = req.app || res.app,
                status = res.statusCode,
            method = req.method,
            url = req.url || '-',
            referer = req.header('referer') || '-',
            ua = useragent.parse(req.header('user-agent')),
            httpVersion = req.httpVersionMajor+'.'+req.httpVersionMinor,
            ip, logFn;


            if(!logger) {
                opts.name = (opts.name || app.settings.shortname || app.settings.name || app.settings.title || 'express');
                opts.serializers = opts.serializers || {};
                opts.serializers.req = opts.serializers.req || bunyan.stdSerializers.req;
                opts.serializers.res = opts.serializers.res || bunyan.stdSerializers.res;
                err && ( opts.serializers.err = opts.serializers.err || bunyan.stdSerializers.err);
                logger = bunyan.createLogger(opts);
            }

            if(err || status >= 500) { // server internal error or error
                logFn = logger.error;
            }else if (status >= 400) { // client error
                logFn = logger.warn;
            }else { // redirect/success
                logFn = logger.info;
            }

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
                'body': req.body && req.body.toString && req.body.toString().substring(0, Math.max(req.body.toString().length, 20)),
                'http-version': httpVersion,
                "status-code": status,
                'content-length': req.get('Content-Length'),
                'req': req,
                'res': res
            };

            err && (meta.err = err);

            logFn.call(logger, meta, opts.format(meta));
        }
        
        res.on('finish', logging);
        res.on('close', logging);

        next();
    };
};



function compile(fmt) {
    fmt = fmt.replace(/"/g, '\\"');
    var js = '  return "' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function(_, name, arg){
        if(arg)
            return '"\n + (meta["' + name + '"] ? meta["'+ name + '"]["'+ arg + '"] : "-") + "';
        return '"\n    + ((meta["' + name + '"]) || "-") + "';
    }) + '";';
    return new Function('meta', js);
}
