const Q = require('q');
const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');

exports.download = function (request, response) {

  console.log("Downloading");

  var resFolder = request.body.folder;
  var fileName = request.body.fileName;

  // If modifying these scopes, delete your previously saved credentials
  // at ~/.credentials/drive-nodejs-quickstart.json
  const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
  const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
  const TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-quickstart.json';

// Load client secrets from a local file.
  fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }

    // Authorize a client with the loaded credentials, then call the
    // Drive API.
    authorize(JSON.parse(content), getFilesIDs);
  });

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   *
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  function authorize(credentials, callback) {
    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
      if (err) {
        getNewToken(oauth2Client, callback);
      } else {
        oauth2Client.credentials = JSON.parse(token);
        callback(oauth2Client);
      }
    });
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   *
   * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback to call with the authorized
   *     client.
   */
  function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
      rl.close();
      oauth2Client.getToken(code, function (err, token) {
        if (err) {
          console.log('Error while trying to retrieve access token', err);
          return;
        }
        oauth2Client.credentials = token;
        storeToken(token);
        callback(oauth2Client);
      });
    });
  }

  /**
   * Store token to disk be used in later program executions.
   *
   * @param {Object} token The token to store to disk.
   */
  function storeToken(token) {
    try {
      fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
      if (err.code != 'EEXIST') {
        throw err;
      }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
  }

  function getFilesIDs(auth) {
    var densityFolders = [
      {destiny: 'drawable-ldpi', from: '0Bym81xKPYEuDfmdBUjdRam9lRXlzUHZwR01BOEYwWjJjbTJhRnJZQ01WTjJjT0dSQWxkaG8'}
      , {destiny: 'drawable-mdpi', from: '0Bym81xKPYEuDfi1PRGduQkZUYnJFVnhaTllpWEFnT0oyc2pHd3FxbERSZ1NHOEhjVDRRSjg'}
      , {destiny: 'drawable-hdpi', from: '0Bym81xKPYEuDfkZkbnVnNE5TdW83eGRQRXc0Q0pZVmhnaFY2LURFR3hpN3lTM21ZZ3pNSWc'}
      , {destiny: 'drawable-xhdpi', from: '0Bym81xKPYEuDflFiQmR0SGhhZGd1UklRZHdJZ084TWpwdHRZZkpndFpJNkJFN1VJeUpITWc'}
      , {destiny: 'drawable-xxhdpi', from: '0Bym81xKPYEuDfmdRZ0VMOTFfOHlzMkREWVhxNFRPQ1MyUWNGWG11cy1kME8wYVVMczN5bTA'}
      , {
        destiny: 'drawable-xxxhdpi',
        from: '0Bym81xKPYEuDfmdtd1BmdmowckloMWtad1V1QnhMQjBmWFkwbGRVdG80aEc2WnVLaTNONUU'
      }];

    var promises = [];

    for (var index = 0; index < densityFolders.length; index++) {
      var promise = searchFile(auth, densityFolders[index], fileName);
      promises.push(promise);
    }

    Q.allSettled(promises)
    .then(function (results) {
      results.forEach(function (result) {
        if (result.state === "fulfilled") {
          console.log("Successful download");
        } else {
          console.log("Download fail");
        }
      });
      return response.status(200).json({message: "Saved!"});
    });

  }

  function searchFile(auth, folderInfo, fileName) {

    var fromFolder = folderInfo.from;
    var destinyFolder = folderInfo.destiny;

    var deferred = Q.defer();
    var service = google.drive('v3');
    service.files.list({
      auth: auth,
      q: '"' + fromFolder + '" in parents and name = "' + fileName + '"',
      'fields': "nextPageToken, files(id, name)"
    }, function (err, response) {

      if (err) {
        console.log('The API returned an error: ' + err);
        deferred.reject(err);
        return;
      }

      var file = response.files[0];

      if (file && file.id) {
        var dest = fs.createWriteStream(resFolder + destinyFolder + "/" + fileName);
        service.files.get({
          fileId: file.id,
          alt: 'media'
        })
        .on('end', function () {
          deferred.resolve();
        })
        .on('error', function (err) {
          console.log('Error during download', err);
          deferred.reject(err);
        })
        .pipe(dest);
      } else {
        deferred.reject("No file found");
      }
    });

    return deferred.promise;
  }
};


