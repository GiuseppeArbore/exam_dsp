'use strict';

var path = require('path');
var http = require('http');
var cors = require('cors');
var fs = require('fs');
var oas3Tools = require('oas3-tools');
var { Validator, ValidationError } = require('express-json-validator-middleware');
var serverPort = 3001;

/** Authentication-related imports **/
var passport = require('passport');
var session = require('express-session');

var filmManager = require(path.join(__dirname, 'components/FilmManager'));
var userController = require(path.join(__dirname, 'controllers/UsersController'));
var filmController = require(path.join(__dirname, 'controllers/FilmsController'));
var reviewController = require(path.join(__dirname, 'controllers/ReviewsController'));
var editRequestController = require(path.join(__dirname, 'controllers/EditRequestsController'));
var utils = require(path.join(__dirname, 'utils/writer.js'));

/** Set up and enable Cross-Origin Resource Sharing (CORS) **/


var corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
  };
  
  
/*** Passport ***/
  
passport.serializeUser(function (user, cb) { 
    cb(null, user);
});
  
passport.deserializeUser(function (user, cb) { 
    return cb(null, user); 
});
  
  
/*** Defining authentication verification middleware ***/
  
const isLoggedIn = (req, res, next) => {
if(req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({error: 'Not authorized'});
}

/*** Defining JSON validator middleware ***/

var filmSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'film_schema.json')).toString());
var userSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'user_schema.json')).toString());
var reviewSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'review_schema.json')).toString());
var editRequestSchema = JSON.parse(fs.readFileSync(path.join('.', 'json_schemas', 'editRequest_schema.json')).toString());
var validator = new Validator({ allErrors: true });
validator.ajv.addSchema([userSchema, filmSchema, reviewSchema, editRequestSchema]);
const addFormats = require('ajv-formats').default;
addFormats(validator.ajv);
var validate = validator.validate;


/*** Swagger configuration ***/

var options = {
    routing: {
        controllers: path.join(__dirname, './controllers')
    },
};

var expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'api/openapi.yaml'), options);
var app = expressAppConfig.getApp();

// Creating the session

app.use(cors(corsOptions));
app.use(session({
    secret: "shhhhh... it's a secret!",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 300000 } //timeout of 5 minutes in milliseconds
  }));
  app.use(passport.authenticate('session'));


//Route methods

app.get('/api', function(req, res, next) {utils.writeJson(res, new filmManager());});
app.get('/api/films/public', filmController.getPublicFilms);
app.post('/api/films', isLoggedIn, validate({ body: filmSchema }), filmController.createFilm);
app.get('/api/films/private/:filmId', isLoggedIn, filmController.getSinglePrivateFilm);
app.put('/api/films/private/:filmId', isLoggedIn, validate({ body: filmSchema }), filmController.updateSinglePrivateFilm);
app.delete('/api/films/private/:filmId', isLoggedIn, filmController.deleteSinglePrivateFilm);
app.get('/api/films/public/invited', isLoggedIn, filmController.getInvitedFilms);
app.get('/api/films/public/:filmId', filmController.getSinglePublicFilm);
app.put('/api/films/public/:filmId', isLoggedIn, validate({ body: filmSchema }), filmController.updateSinglePublicFilm);
app.delete('/api/films/public/:filmId', isLoggedIn, filmController.deleteSinglePublicFilm);
app.get('/api/films/public/:filmId/reviews', reviewController.getFilmReviews);
app.post('/api/films/public/:filmId/reviews', isLoggedIn, reviewController.issueFilmReview);
app.get('/api/films/public/:filmId/reviews/:reviewerId', reviewController.getSingleReview);
app.put('/api/films/public/:filmId/reviews/:reviewerId', isLoggedIn, reviewController.updateSingleReview);
app.delete('/api/films/public/:filmId/reviews/:reviewerId', isLoggedIn, reviewController.deleteSingleReview);
app.post('/api/films/public/:filmId/reviews/:reviewerId/editRequests', isLoggedIn ,editRequestController.issueEditRequest); 
app.get('/api/films/public/:filmId/reviews/:reviewerId/editRequests', isLoggedIn, editRequestController.getEditRequests);

app.get('/api/films/public/:filmId/reviews/:reviewerId/editRequests/:editRequestId', isLoggedIn, editRequestController.getSingleEditRequest);
app.put('/api/films/public/:filmId/reviews/:reviewerId/editRequests/:editRequestId', isLoggedIn, editRequestController.updateEditRequest);
app.delete('/api/films/public/:filmId/reviews/:reviewerId/editRequests/:editRequestId', isLoggedIn, editRequestController.deleteEditRequest);

app.get('/api/films/public/reviews/editRequests/received', isLoggedIn, editRequestController.getPendingEditRequests);
app.get('/api/films/public/reviews/editRequests/sent', isLoggedIn, editRequestController.getSentEditRequests);

app.get('/api/users', isLoggedIn, userController.getUsers);
app.post('/api/users/authenticator', userController.authenticateUser);
app.get('/api/users/:userId', isLoggedIn, userController.getSingleUser);
app.get('/api/films/private', isLoggedIn, filmController.getPrivateFilms);

// Error handlers for validation and authentication errors

app.use(function(err, req, res, next) {
    if (err instanceof ValidationError) {
        res.status(400).send(err);
    } else next(err);
});

app.use(function(err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        var authErrorObj = { errors: [{ 'param': 'Server', 'msg': 'Authorization error' }] };
        res.status(401).json(authErrorObj);
    } else next(err);
});


// Initialize the Swagger middleware

http.createServer(app).listen(serverPort, function() {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
});