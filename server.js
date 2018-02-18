const express = require("express");
const path = require("path");
const app = express();

const httpClient = require("xhr-request");
const dateFormat = require("dateformat");
const config = require("./config.js");

//Connecting with database
const mongo = require("mongodb");
const MongoClient = mongo.MongoClient;

//Google's custom search API
const baseAPI = 'https://www.googleapis.com/customsearch/v1';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/searchimage/:query', (req, res)=>{
    var queryString = req.params.query;
    //For pagination the offset value gets converted to the start index value in the api. Ex: 2 -> (2*10)-9 = 11
    var offsetValue = req.query.offset;
    var pagination = (offsetValue*10)-9;
    //The api url with all the query parameters
    var URL = baseAPI+
            '?key='+config.API_KEY+
            '&cx='+config.SEARCH_ENGINE_ID+
            '&q='+queryString+
            '&searchType=image&num=10&fields=items&start='+pagination;
            
    httpClient(URL, {json: true}, function (err, data) {
         if (err){
             throw err;
         } else{
            console.log('Image Search Successful');
             // the JSON result
            var items = data.items;
            var itemArr = [];
            for(var i = 0; i<items.length; i++){
                itemArr[i] = {
                    url: items[i].link,
                    snippet: items[i].snippet,
                    thumbnail: items[i].image.thumbnailLink,
                    context: items[i].image.contextLink
                };
            }
            res.json(itemArr);
         }
    });
    
    var date = new Date();
    var formattedDate = dateFormat(date, "dddd, mmmm dS, yyyy, h:MM:ss TT");
    
    var saveSearch = {
        term: queryString,
        when: formattedDate
    };
    
    MongoClient.connect(config.MONGO_URL, (err,db)=>{
        console.log('Connected to database.');
        if(err) throw err;
        var mydb = db.db('smm').collection('savedSearches');
        mydb.insertOne(saveSearch, (err, res)=>{
            if(err) throw err;
            console.log(JSON.stringify(saveSearch));
            //Close connection
            db.close();
        });
    });
});

app.get('/api/latest/imagesearch', (req, res)=>{
    MongoClient.connect(config.MONGO_URL, (err,db)=>{
        console.log('Connected to database.');
        if(err) throw err;
        var mydb = db.db('smm').collection('savedSearches');
        mydb.find({}, { fields:{term: 1, when: 1, _id: 0} }).sort({_id:-1}).limit(10).toArray((err, result)=>{
            if(err){
                console.log('Error: '+err);
            } else{
                res.json(result);
                db.close();
            }
        });
    });
});

var listener = app.listen(process.env.PORT, ()=>{
    console.log("The app is now listening on port "+listener.address().port);
});
