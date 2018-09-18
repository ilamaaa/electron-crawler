
'use strict';

var {app, BrowserWindow, ipcMain} = require('electron');

var mainWindow = null;


// Query the database for all the links it has and calls the crawler on a link not yet crawled
const startNextPage = (db, callback, limit) => {
	db.find({}, (er, data) => {
		if (er) console.log(er)
		let crawledLinks = data.map(z => z.url)
		let allLinks = data
						.map(x => x.links)
						.reduce((x, y) => x.concat(y), [])
		let que = allLinks.filter(x => crawledLinks.indexOf(x) < 0)
		crawler(que[0], callback, limit)
	})
}

// Updates the GUI prompt with the current and total pages and calls the function to trigger the next pages request
const statusCheck = (db, callback, page, limit) => {
	db.find({}, function(er,data){
		if(er) console.log(er);
		callback("just added: " + page + " so far there are: " + data.length + " pages in the database");
		if (data.length > limit){
			callback("nah i am fucking done did what you asked: " + limit + " pages")
		} else {
			startNextPage(db, callback, limit)
		}
	})
}


// grab and sort of the links, i am sure there is a much nicer way to do this but i don't know that yet
const Links = ($, page) => {
	const url = require('url')
	var pageBits = url.parse(page, true)
	var Links = [];
	var validUrl = require('valid-url')
	$('a').each((i, link) => {
		try {
			let href = $(link).attr('href')
			var hrefBits  = url.parse(href, true)
			if(pageBits.host == hrefBits.host & pageBits.protocol === hrefBits.protocol){
				if(Links.indexOf(href) < 0){
					Links.push(href);
				}
			} else if (pageBits.host == hrefBits.host){	
				var absolute = pageBits.protocol + href;
				if(Links.indexOf(absolute) < 0){
					Links.push(absolute);
				}
			} else if (hrefBits.host == null) {
				var absolute = pageBits.protocol + "//" + pageBits.host + href
					if(Links.indexOf(absolute) < 0){
					Links.push(absolute);
				}
			}
		} catch (error) {
			console.log(error)
		}
	})
	return Links
}


// The Scrape just gets links at the moment and of course the page title
const scrape = (html, page, callback) => {
	const cheerio = require("cheerio");
	const $ = cheerio.load(html)
	callback(Links($, page), $('title').text())
}


// The Crawler itself which requests the page, calles the scraping function and updates the database through the scrape functions callback
const crawler = (page, callback, limit) => {
	const request = require("request");
	const options = {
		  	method: 'GET',
  			uri: page,
  			followRedirect: false
	}
	request.get(page, function(error, response, html){
		if(error) {
			console.log("not this page: " + page);
			db.insert({
				url: page,
				status: "bad link",
				title: "bad link",
				links: []
			}, function(er, data){
				if(er) console.log(er);
				statusCheck(db, callback, page, limit)
			})
		} else {
			console.log("requested page: " + page)
			scrape(html, page, function(Links, title){
				db.insert({
					url: page,
					status: response.statusCode,
					title: title,
					links: Links
				}, function(er, data){
					if(er) console.log(er);
					statusCheck(db, callback, page, limit)
				})
			})
		}
	})
}

// take url from the ipc message and pass it to the crawler after clearing the whitespace 
const startEverthingOff = (responseCallback, args) => {
	const urlstring = args[0]
	const limit = args[1]
	const startPage = urlstring.replace(/\s/g, '')
	crawler(startPage, responseCallback, limit)
}


// cleardb
const deleteData = () => {
	console.log("got to delete")
	db.remove({ }, { multi: true }, function (err, numRemoved) {
		db.loadDatabase(function (err) {
		// done
 		});
	});
}

//querydb
const querydb = (callback, query) => {
	db.find({},function (err, data) {
		var html = "<ol>"
		var counter = 0
		data.forEach(function(item){
			html = html + "<li>" + item[query] + "</li>"
			counter++
			if(data.length == counter){
				callback(html + "</ol>")
			}
		})
	});
}

// connect to db
var datastore = require("nedb")
var db = new datastore({filename:"data/data", autoload: true}); 
db.loadDatabase()

// Open the app
app.on('ready', function() {
    mainWindow = new BrowserWindow({
        height: 600,
        width: 800
    });
    mainWindow.loadURL('file://' + __dirname + '/app/index.html');
});

// clears database on request recieved
ipcMain.on('del-message', (event, arg) => {
	console.log("got to index")
	deleteData()
})


// query the data
ipcMain.on('query-message', (event, arg) => {
	querydb(function(message){
		event.sender.send('query-reply', message)
	}, arg)
})


// Listens to the renderer process and when triggered send the data and callback which will respond
ipcMain.on('asynchronous-message', (event, arg) => {
	startEverthingOff(function(message){
		event.sender.send('asynchronous-reply', message)
	}, arg)
})


