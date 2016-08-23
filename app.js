var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.set('port', (process.env.PORT || 3000));

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));

app.set('views', __dirname + '/views/pages');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

require('./routes')(app);

app.get('/', function (request, response) {
  response.render('main.html');
});

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});