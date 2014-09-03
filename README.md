# Express-bunyan-logger

A express logger middleware powered by [bunyan](https://github.com/trentm/node-bunyan).

[![Build Status](https://travis-ci.org/villadora/express-bunyan-logger.png?branch=master)](https://travis-ci.org/villadora/express-bunyan-logger) [![dependencies](https://david-dm.org/villadora/express-bunyan-logger.png)](https://david-dm.org/villadora/express-bunyan-logger)


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

Function that translate statusCode into log level.

```
function(status, err /* only will work in error logger */) {
     // return string of level
     return "info";
}
```

### options.excludes

Array of string, Those fields will be excluded from meta object which passed to bunyan

### options.immediate

Write log line on request instead of response (for response times)

### optiosn.genReqId

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
