const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect("mongodb://mongodbuser:mongodbuser1@cluster0-shard-00-00-ytel8.mongodb.net:27017,cluster0-shard-00-01-ytel8.mongodb.net:27017,cluster0-shard-00-02-ytel8.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true", { useNewUrlParser: true } )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

var Schema = mongoose.Schema;
var userSchema = new Schema({
  username: {type: String}
});
var exerciseSchema = new Schema({
  user_id: {type: String},
  description: {type: String},
  duration: {type: Number},
  date: {type: Date}
});

var User = mongoose.model("user", userSchema);
var Exercise = mongoose.model("exercise", exerciseSchema);


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/** Add user */
app.post("/api/exercise/new-user", function(req, res, next) {
  let userName = req.body.username;
  if (undefined === userName || !userName) {
    res.send("Path `username` is required.");
  }
  
  User
    .find({
      username: userName
    })
    .then(doc => {
      if (doc[0] === undefined) {       
        User.collection.insert([ {username: userName} ], {}, (data) => {console.log(data, "INSERT")});
        User.find({username: userName}).then(u => {
          res.send({username: u[0].username, _id: u[0]._id});
        });
           
      } else {
        res.send("username already taken");
      }
    })
    .catch(err => {
      console.error(err)
    })
});


/** Add exercise */
app.post("/api/exercise/add", function(req, res, next) {
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = !req.body.date ? new Date() : new Date(req.body.date);
  
  
  User
    .findById(userId)
    .then(doc => {
      if (doc === undefined) {       
        res.send("unknown _id");
      } else {
        if (!duration) {
          res.send("Path `duration` is required.");
        } else {
          duration = parseInt(duration);
        }
        
        if (!description) {
          res.send("Path `description` is required.");
        }
        
        Exercise.collection.insert([ {user_id: userId, description: description, duration: duration, date: date} ], {}, (data) => {
          res.json({
            username: doc.username,
            description: description,
            duration: duration,
            _id: doc._id,
            date: date
          });
        });
        
      }
    })
    .catch(err => {
      console.log(err);
      res.send("unknown _id");
    })
});

app.get("/api/exercise/log", function(res, req, next) { 
  
  let query = req.query === undefined ? req.req.query : req.query;
  let userId = query.userId;
  let ret = {}
  
  if (!userId) {
    res.send("unknown userId");
  }
  
  User
    .findById(userId)
    .then(doc => {
      if (doc === undefined) {       
        res.send("unknown _id");
      } else {
        
        ret.username = doc.username;
        ret._id = doc._id;
        
        let from = null;
        let to = null;
        let limit = null;
        let filter = {user_id: userId};
        
        
        // from
        if (query.from) {
          from = new Date(query.from);
          if (!isNaN(from.valueOf())) {
            if (undefined === filter['date']) {
              filter['date'] = {'$gte': from};
            } else {
              filter['date']['$gte'] = from;
            }
            ret.from = from.toDateString();
          }
        }
        
        // to
        if (query.to) {
          to = new Date(query.to);
          if (!isNaN(to.valueOf())) {
            
            if (undefined === filter['date']) {
              filter['date'] = {'$lte': to};
            } else {
              filter['date']['$lte'] = to;
            }
            ret.to = to.toDateString();
          }
        }
        
        // limit
        if (query.limit) {
          limit = parseInt(query.limit);
          ret.limit = limit;
        }
        
        Exercise.find(filter, 'description duration date').sort({'date': -1}).limit(limit).then((res, next) => {
          ret.log = res;
          return ret;
        }).then((r) => {
          res.res.send(ret);
        })
      }
  });
});
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
