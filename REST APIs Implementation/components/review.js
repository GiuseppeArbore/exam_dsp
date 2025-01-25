class Review{    
    constructor(filmId, reviewerId, completed, reviewDate, rating, review, userId, ownerId){ 

        this.filmId = filmId;
        this.reviewerId = reviewerId;
        this.completed = completed;

        if(reviewDate)
            this.reviewDate = reviewDate;
        if(rating)
            this.rating = rating;
        if(review)
            this.review = review;
        
        var selfLink = "/api/films/public/" + this.filmId + "/reviews/" + this.reviewerId;
        var editRequestLink = "/api/films/public/" + this.filmId + "/reviews/" + this.reviewerId + "/editRequests";
        this.self =  selfLink;
        if(userId===reviewerId || userId===ownerId)
            this.editRequests = editRequestLink;
    }
}

module.exports = Review;


