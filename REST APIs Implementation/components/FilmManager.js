class FilmManager{    
    constructor() {
        this.film = "/api/films/";
        this.privateFilms = "/api/films/private/";
        this.publicFilms = "/api/films/public/";
        this.invitedPublicFilms = "/api/films/public/invited";
        this.reviewAssignments = "/api/films/public/assignments";
        this.editRequestsReceived = "/api/films/public/reviews/editRequests/received";
        this.editRequestsSent = "/api/films/public/reviews/editRequests/sent";
        this.users = "/api/users/";
        this.usersAuthenticator = "/api/users/authenticator";
    }
}

module.exports = FilmManager;


