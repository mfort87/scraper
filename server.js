var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var request = require("request");
var cheerio = require("cheerio");

// =========== Express App Initialization =========
var app = express();
var PORT = process.env.PORT || 3000;

// =========== Pass Through Logger ================
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));
// created a public folder to land
app.use(express.static("public"));

// ========== Configure Database ==================
mongoose.connect("mongodb://heroku_660k06l5:e7vp5i3c853m4722qie184st13@ds037698.mlab.com:37698/heroku_660k06l5");
var db = mongoose.connection;

db.on("error", function(err) {
    console.log("Mongoose Error", err);
});

db.once("open", function() {
    console.log("Mongoose connection successful");
});
mongoose.Promise = Promise;

// ========== Schema In The House =================
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

// ========== Handlebars (I can ride my bike...) ==
var bike = require("express-handlebars");

app.engine("handlebars", bike({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// ========= Routes (GET / POST) ==================
// var routes = require("./controllers/controller.js");

// ========== Scrape the requested site =========
// ========== and get all cheerio elements ======
app.get('/', function(req, res) {
    Article.find({}, function(err, data) {
        if (err) {
            console.log(err);
        } else {
            res.json(data);
        }
    });
});

app.get('/scrape', function(req, res) {
    request('http://www.theonion.com/', function(error, response, html) {

        var $ = cheerio.load(html);

        $('article h2').each(function(i, element) {
            var result = {};

            result.title = $(this).children('a').text();
            result.link = $(this).children('a').attr('href');

            var entry = new Article(result);
            entry.save(function(err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(doc);
                }
            });
        });
    });
    res.send('Scrape complete');
});

// ========== Show Scraped Articles ===============
app.get('/articles', function(req, res) {
    Article.find({}, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    });
});

// ========== Shows A Specific Article ============
app.get('/articles/:id', function(req, res) {
    Article.findOne({ '_id': req.params.id })
        .populate('note')
        .exec(function(err, doc) {
            if (err) {
                console.log(err);
            } else {
                res.json(doc);
            }
        });
});

// ========== Post A Specific Article ==============
app.post('/articles/:id', function(req, res) {
    var newNote = new Note(req.body);
    newNote.save(function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            Article.findOneAndUpdate({ '_id': req.params.id }, { 'note': doc._id })
                .exec(function(err, doc) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.send(doc);
                    }
                });
        }
    });
});

app.post('/articled/:id', function(req, res) {
    Article.findOneAndUpdate({ '_id': req.params.id }, { "ignore": true }).exec(function(err, data) {
        if (err) {
            console.log(err);
        } else {
            res.send(data);
        }
    });
});

// ========== Open port on server and listen ======
app.listen(PORT, function() {
    console.log('Woohoo, the server is working! It is listening on port ' + PORT);
});