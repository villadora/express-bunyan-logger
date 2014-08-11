var express = require('express'),
app = express(),
bunyanLogger = require('../');

app.get('/', function(req, res) {
    throw new Error();
});

app.use(bunyanLogger());
app.use(bunyanLogger.errorLogger());

app.listen(5000);
