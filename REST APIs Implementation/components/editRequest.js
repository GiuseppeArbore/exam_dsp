class editRequest {    
    constructor(id, filmId, reviewerId, deadline, status) {
        this.id = id;
        this.filmId = filmId;
        this.reviewerId = reviewerId;
        this.deadline = deadline;
        
        if(status)
            this.status = status;
        else
            this.status = "pending";

        var selfLink = "/api/films/public/" + this.filmId + "/reviews/" + this.reviewerId + "/editRequests/" + this.id;
        this.self =  selfLink;
    }
}

module.exports = editRequest;


