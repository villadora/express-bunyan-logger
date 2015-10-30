# Express-bunyan-logger

A express logger middleware powered by [bunyan](https://github.com/trentm/node-bunyan).

[![Build Status](https://travis-ci.org/villadora/express-bunyan-logger.svg?branch=master)](https://travis-ci.org/villadora/express-bunyan-logger) [![dependencies](https://david-dm.org/villadora/express-bunyan-logger.svg)](https://david-dm.org/villadora/express-bunyan-logger)


## Note

This year as work content change, I have no spare time to maintaining the node modules, if anyone want to take or keep maintaining, just contact me via jky239@gmail.com with Title contains: "Wanted: npm package xxxx". Thx.

## Installation

    npm install express-bunyan-logger
   
## Usage

To use the logger: 

    app.use(require('express-bunyan-logger')());

To use the errorLogger:

    app.use(require('express-bunyan-logger').errorLogger());

And you can also pass bunyan logger options to the logger middleware:

    app.use(require('express-bunyan-logger')({
        name: 'logger', 
        streams: [{
            level: 'info',
            stream: process.stdout
            }]
        }));

Change default format:

    app.use(require('express-bunyan-logger')({
        format: ":remote-address - :user-agent[major] custom logger"
    });

And a child logger will be attached to each request object:

```javascript
app.use(require('express-bunyan-logger')();
app.use(function(req, res, next) {
    req.log.debug('this is debug in middleware');
    next();
});
```

## Configuration

### options.format

Format string, please go the source code to the metadata. ":name" will print out meta.name; ":name[key]" will print out the property 'key' of meta.name.

Or you can pass a function to _options.format_. This function accept a object as argument and return string.

### options.parseUA

Whether to parse _user-agent_ in logger, default is =true=.

### options.levelFn

Function that translate statusCode into log level. The `meta` argument is an object consisting of all the fields gathered by bunyan-express-logger, before exclusions are applied. 

```
function(status, err /* only will work in error logger */, meta) {
     // return string of level
     if (meta["response-time"] > 30000) {
         return "fatal";
     } else {
         return "info";
     }
}
```

### options.includesFn

Function that is passed `req` and `res`, and returns an object whose properties will be added to the meta object passed to bunyan

```javascript
function(req, res) {
    if (req.user) {
        return {
            _id: req.user._id,
            name: req.user.name
        }
    }
}
```

### options.excludes

Array of string, Those fields will be excluded from meta object which passed to bunyan

### options.serializers

An object of [bunyan serializers](https://github.com/trentm/node-bunyan#serializers). They are passed on to bunyan.
The default serializers are defined as follows:
```
{
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res,
    err: bunyan.stdSerializers.err
}
```

### options.immediate

Write log line on request instead of response (for response times)

### options.genReqId

By default, `express-bunyan-logger` will generate an unique id for each request, and a field 'req_id' will be added to child logger in `request` object.

If you have already use other middleware/framework to generate request id, you can pass a function to retrieve it:

```javascript
// suppose connect-requestid middleware is already added.
app.use(require('express-bunyan-logger')({
    genReqId: function(req) {
       return req.id;
    }
});
```


## License

(The BSD License)

    Copyright (c) 2013, Villa.Gao <jky239@gmail.com>;
