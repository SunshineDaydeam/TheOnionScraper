// Required NPM Packages
const express = require('express');
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const request = require("request");
const cheerio = require("cheerio");
const path = require('path');

// Require all models
const db = require("./models");

// Express Port
const PORT = process.env.PORT || 3000;
console.log(PORT)
const app = express();

// Middleware
app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Handlebars
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main"
  })
);
app.set("view engine", "handlebars");

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});

// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/theOnionScraper");




// ROUTES

// GET Route for scraping The Onion - American Voices and Auto-Saving to Database
app.get("/scrape", function(req, res) {
  request("https://www.theonion.com/c/american-voices", function(error,response, html) {
    const $ = cheerio.load(response.body);

    // Grab Every Article
    $("article").each(function(i, element) {
      
      // Create an object with title, link, and summary
      let result = {};
      result.title = $(this)
        .find(".item__text h1 a")
        .text();
      result.link = $(this)
        .find(".item__text h1 a")
        .attr("href");
      result.summary = $(this)
        .find('p')
        .text();

      //Check if article is already in the database (By Title)
      db.Article.findOne({title: result.title})
        .then(function(found){
          //
          if (found){
            console.log('Already Found')
          }
          else{
            db.Article.create(result)
              .then(function(dbArticle) {
              // View the added result in the console
              console.log('Added New Article')
              console.log(dbArticle);
              })
              .catch(function(err) {
              // If an error occurred, send it to the client
              return res.json(err);
              });
          }
        });
    });
    // If we were able to successfully scrape and save an Article, send a message to the client
    res.redirect("/");
  });
});
// GET all Articles
app.get("/api/articles", function(req, res) {
  db.Article.find({})
    .then(function(dbArticles){
      res.json(dbArticles);
    }).catch(function(err){
      res.json(err);
    })
});
// GET all Comments
app.get('/api/comments', function(req, res){
  db.Comment.find({})
    .then(function(dbComments){
      res.json(dbComments);
    }).catch(function(err){
      res.json(err);
    })
})
// GET specific article by ID and populate Comments
app.get("/api/articles/:id", function(req, res){
  db.Article.findOne({ _id: req.params.id})
    .populate('comment')
    .then(function(dbArticle){
      res.json(dbArticle);
    }).catch(function(err){
      res.json(err)
    })
})
// GET all Saved Articles
app.get("/api/savedArticles", function(req, res){
  db.Article.find({ saved: true})
    .populate('comment')
    .then(function(dbArticle){
      res.json(dbArticle);
    }).catch(function(err){
      res.json(err)
    })
})
// POST - New Comment
app.post('/api/addComment', function(req, res){
  db.Comment.create({ body: req.body.body })

    .then(function(dbComment){
      return db.Article.findOneAndUpdate({ _id:req.body._id }, {$push:{ comment: dbComment._id }}, { new: true });
    })
    .then(function(dbArticle){
      // res.send({redirect: '/'});
    })
    .catch(function(err){
      res.json(err)
      console.log(err)
    })
})
// Route - Save Article
app.put('/api/savedArticles', function(req, res) {
  console.log(req.body)
  console.log('Hello')
  db.Article.findOneAndUpdate(req.body, { saved: true }, { new: true })
    .then(function(dbArticleSaved){
      res.json(dbArticleSaved)
    })
    .catch(function(err){
      res.json(err)
      console.log(err)
    })
})
// POST - Delete Article from Saved
app.delete('/api/savedArticles', function(req, res) {
  db.Article.findOneAndUpdate(req.body, { saved: false }, { new: true })
    .then(function(dbArticleRemoved){
      res.json(dbArticleRemoved)
    })
    .catch(function(err){
      res.json(err)
      console.log(err)
    })
})

app.delete('/api/comment/:id', (req, res) => {
  db.Comment.findOneAndRemove({_id:req.params.id}, (err) => {
    if (err) console.log('error deleting note', err);
		res.send();
  })
})


// HTML ROUTES

// Home Page
app.get("/", function(req, res) {
  db.Article.find({})
  .sort({'saved': -1})
  .populate('comment')
  .then(function(dbArticle){
    res.render("home", {
      Articles: dbArticle
    });
  })
});

// Add/Edit Comment Page
app.get("/article/Comments/:id", function(req, res){
  db.Article.findOne({ _id: req.params.id})
    .populate('comment')
    .then(function(dbArticle){
      res.render('editcomment', {
        Article: dbArticle
      })
    }).catch(function(err){
      res.json(err)
    })
})

// Saved Jobs Page
app.get('/savedArticles', function(req, res){
  db.Article.find({ saved : true })
    .populate('comment')
    .then(function(dbArticle){
      res.render('savedArticles', {
        Articles: dbArticle
      })
    }).catch(function(err){
      res.json(err)
    })
})
  

