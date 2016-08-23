var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));

app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views/pages');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
  response.render('main.html');
});

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});