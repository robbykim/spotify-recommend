var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function (endpoint, args) {
  var emitter = new events.EventEmitter();
  unirest.get('https://api.spotify.com/v1/' + endpoint)
    .qs(args)
    .end(function (response) {
      if (response.ok) {
        emitter.emit('end', response.body);
      } else {
        console.log('ERROR');
        emitter.emit('error', response.code);
      }
    });
  return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function (req, res) {
  var searchReq = getFromApi('search', {
    q: req.params.name,
    limit: 1,
    type: 'artist'
  });

  searchReq.on('end', function (item) {
    var artist = item.artists.items[0];
    var relatedReq = getFromApi('artists/' + artist.id + '/related-artists', {
      limit: 5
    });
    relatedReq.on('end', function (item) {
      artist.related = item.artists;
      var completed = 0;
      var checkComplete = function () {
        if (completed === artist.related.length) {
          res.json(artist);
        }
      };

      artist.related.forEach(function (value, index) {
        var topTracks = getFromApi('artists/' + artist.related[index].id + '/top-tracks', {
          country: 'US'
        });
        topTracks.on('end', function (item) {
          artist.related[index].tracks = item.tracks;
          completed += 1;
          checkComplete();
        });

        topTracks.on('error', function (code) {
          res.sendStatus(code);
        });
      });
    });

    relatedReq.on('error', function (code) {
      res.sendStatus(code);
    });
  });

  searchReq.on('error', function (code) {
    res.sendStatus(code);
  });
});

app.listen(8080);
