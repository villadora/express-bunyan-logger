var express = require('express'),
app = express(),
bunyanLogger = require('../');

app.use(app.router);
app.use(bunyanLogger());
app.use(bunyanLogger.errorLogger());

app.get('/', function(req, res) {
    throw new Error();
});


app.listen(5000);
