## REST APIs Implementation

This folder contains the code of the Film Manager service application:
- [api](./api/): contains the openapi file of the Film Manager service.
- [components](./components): contains the components of the REST API.
- [controllers](./controllers): contains the controllers of the REST API.
- [database](./database): contains the database and a zip file with the database schema if needed to restore it.
- [json_schemas](./json_schemas): contains the JSON Schemas used in the REST API.
- [service](./service): contains the services of the REST API.
- [utils](./utils): contains the utility functions used in the REST API.
- [index.js](./index.js): the entry point of the REST API.

## NEW CODE IMPLEMENTATION

### 1. **Database**:
Add a Table called `editRequests` to the database to store the edit requests of the reviews. This table has the following columns:
- `id`: the unique identifier of the edit request.
- `filmId`: the unique identifier of the film, foreign key to the `films` table with `ON DELETE CASCADE`.
- `reviewerId`: the unique identifier of the reviewer, foreign key to the `users` table with `ON DELETE CASCADE`.
- `status`: the status of the edit request. It can be one of the following values: `pending`, `approved`, `rejected`.
- `deadline`: the deadline of the edit request.

### 2. **INDEX**:
Add the following route methods to the REST API:
- `POST /api/films/{filmId}/reviews/{reviewerId}/editRequests`: create a new edit request for a review.
  - the user has to be authenticated, and he has to be `reviewer` of the review.
  - the user has to provide the `deadline` of the edit request.
  - the status of the edit request is `pending` by default.
  - the user __cannot__ create an edit request if he has already an edit request for the review that is not rejected or expired.
  - the user __cannot__ create an edit request if the review is not completed.
  - the user __cannot__ create an edit request if a previous edit request was approved and he didn't update the review yet.


- `GET /api/films/{filmId}/reviews/{reviewerId}/editRequests`: get all the edit requests of a review.
  - the user has to be authenticated, and he has to be `reviewer` of the review or the `owner` of the film.

- `GET /api/films/{filmId}/reviews/{reviewerId}/editRequests/{editRequestId}`: get an edit request by id for a review.
  - the user has to be authenticated, and he has to be `reviewer` of the review or the `owner` of the film.

- `PUT /api/films/{filmId}/reviews/{reviewerId}/editRequests/{editRequestId}`: update an edit request for a review:
  - the user has to be authenticated, and he has to be `owner` of the film.
  - the user can accept or reject the edit request if it's not expired, and the status is `pending`.
  - the user __cannot__ update an edit request if it's already approved or rejected.

- `DELETE /api/films/{filmId}/reviews/{reviewerId}/editRequests/{editRequestId}`: delete an edit request for a review.
  - the user has to be authenticated, and he has to be the `reviewer`.
  - the user __cannot__ delete an edit request if it's already approved, rejected or expired.

- `GET /api/films/public/reviews/editRequests/received`: get all the edit requests received by the user (film owner).
  - the user has to be authenticated.

- `GET /api/films/public/reviews/editRequests/sent`: get all the edit requests sent by the user (reviewer).
  - the user has to be authenticated.


### 3. **Service**:
Add a new service called `EditRequestService` to handle the edit requests of the reviews. This service has the following methods:
- `issueEditRequest`: create a new edit request for a review.
- `getEditRequests`: get all the edit requests of a review.
- `getSingleEditRequest`: get a specjfic edit request.
- `approveEditRequest`: approve an edit request, side-effect: update the status of the review.
- `rejectEditRequest`: reject an edit request.
- `deleteEditRequest`: delete an edit request.
- `getPendingEditRequests`: get all the pending edit requests for the owner.
- `getPendingEditRequestsTotal`: get the total number of pending edit requests, used for pagination.
- `getEditRequestsReceived`: get all the edit requests received by the user.
- `getSentEditRequests`: get all the edit requests sent by the user.
- `getSentEditRequestsTotal`: get the total number of sent edit requests, used for pagination.
- `refreshEditRequests`: refresh the status of the edit requests, if they are expired or not.
- `getPagination`: handle the pagination mechanism.
- `checkAllExpired`: check all the edit requests, for a review, if they are all expired or not.
- `updateSingleExpiredEditRequest`: update the status of a single edit request if it's expired.

### 4. **Controller**:
Add a new controller called `EditRequestController` to handle the edit requests of the reviews. This controller has the following methods:
- `issueEditRequest`: create a new edit request.
- `getEditRequests`: get all the edit requests of a review.
- `getSingleEditRequest`: get a specific edit request.
- `updateEditRequest`: reject or approve an edit request.
- `deleteEditRequest`: delete an edit request.
- `getPendingEditRequest`: get all the pending edit requests for the owner.
- `getSentEditRequests`: get all the edit requests issued by the user.


## MAIN CHANGES TO THE EXISTING CODE
- update [Film manager](./components/FilmManager.js): add hyperlinks to the edit requests issued and received by the user.
- update [review](./components/Review.js): add the hyperlink to the edit requests for the review if the user is the owner of the film or the reviewer.
  - update the `getFilmReviews` and `getSingleReview` to handle this feature in [Reviewscontroller](./controllers/ReviewsController.js).
  - update the `getFilmReviews` and `getSingleReview` to handle this feature in [ReviewsService](./service/ReviewsService.js).
- update the `deleteSingleReview` method in [ReviewsController](./controllers/ReviewsController.js) to make sure that the owner of the film cannot delete a review if it was alredy completed, also if there is an approved edit request for the review that was not updated yet.
- update [index.js](./index.js): add the new routes to the REST API.