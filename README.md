# Exam Call 1

The structure of this repository is the following:
  - ["JSON Schemas"](/JSON%20Schemas/) contains the design of the JSON Schemas and its [README.md](/JSON%20Schemas/README.md) file;
  - ["REST APIs Design"](/REST%20APIs%20Design/) contains the full Open API documentation of the REST APIs, including examples of JSON documents to be used when invoking the operations, and examples of invocations of the API operations as a Postman collection ans its [README.md](/REST%20APIs%20Design/README.md) file;
  - ["REST APIs Implementation"](/REST%20APIs%20Implementation/) contains the code of the Film Manager service application and its [README.md](/REST%20APIs%20Implementation/README.md) file.

## How to run the application
 - Clone the repository
 - Open the terminal and navigate to the folder where the repository is located
 - Navigate to the folder "REST APIs Implementation"
 - run the command `npm start`
 - the backend will start and you can use the API with the following base URL: `http://localhost:3001`

!!! note About the session expiration
    The session expired after 5 minutes, as for lab 1. So if you are using the API for which authentication is needed and you are not authenticated, you have to login again.


### Note about postman collection
In the [REST APIs Design](./REST%20APIs%20Design/) folder there are 2 postman collection:
- [PostmanCollectionExam](./REST%20APIs%20Design/PostmanCollectionExam.json) with examples of correct API calls, only for the new code implemented for the exam.
- [PostmanCollectionV1](./REST%20APIs%20Design/PostmanCollectionV1.json) with a sequence of API calls, including examples of incorrect or forbidden API calls to demonstrate how the system behaves in such cases. To test these APIs effectively, follow the predefined order starting from the provided database. Additionally, to facilitate testing, a copy of the database [databaseV1](./REST%20APIs%20Implementation/database/databaseV1.db) is provided in the zipped folder [databaseV1Arbore](./REST%20APIs%20Implementation/database/databaseV1Arbore.zip).



## Main design choices

### Edit request for a review
The reviewer can ask the owner of the film the permission to modify the review if there isn't a pending edit request for that review, the review is completed and there is no approved request for which the reviewer has not yet edited the review. 
The owner can accept or reject the edit request. The edit request has an expiration date and if the owner doesn't accept or reject the edit request before the expiration date, the edit request is automatically rejected. 
The edit request is identified by its own ID, and its relation with the review is explicitly defined by the filmId-reviewerId pair. The edit request has a status that is by default 'pending'.
The reviewer cannot send a edit request with deadline in the past. The deadline is set by the reviewer.

#### Accept or reject a edit request
- When a edit request is accepted:
  - the reviewer can modify the review
- When a edit request is rejected:
  - the reviewer can't modify the review
- When a edit request is pending:
  - the reviewer can't modify the review
- When a edit request is expired and not accepted before the expiration date:
  - the reviewer can't modify the review
  - the modify request is automatically rejected
- the owner of the film can't delete the review in each of the above cases.


#### Modify request expiration
The check for the expiration of the modify request is done when the owner want to accept or reject the request. If the request is expired, an error is returned. It is also done when an user (owner or reviewer) read the edit request/requests in order to show the status updated because if the request is expired, the status is automatically set to "rejected". In this case, also the database is updated, setting the status of the modify request to "rejected".

### Pagination mechanism
The pagination mechanism is implemented for the list of edit requests issued and for the list edit requests received by a user. It is not implemented for the list of edit requests of a single review because it is not expected to have a lot of edit requests for a single review.

### List of pending edit requests received by a user
The list of pending edit requests received by a user returns the list of edit requests that are not expired and that are not yet accepted or rejected. The list is ordered by the expiration date of the modify request, so the user can see first the modify requests that are going to expire.
The choise of showing only the modify requests that are still pending is due to the fact that the user can accept or reject only the edit requests that are still pending so it is useless to show the edit requests that are already accepted or rejected/expired. 
If a film owner want to look all the edit requests received for a review, he/she can use the list of edit requests for the specific review that will show him/her all the edit requests received for that review. 


### List of edit requests issued by a user
The list of edit requests issued by a user returns the list of all the edit requests issued by the user, ordered, in a descending order, by the expiration date of the edit request, so the user can see first the modify requests that he/she should have made most recently. 
The reviewer can see all the modify requests issued by him/her for a specific review using the list of modify requests for the specific review. 


### Edit requests for a specific review
The list of edit requests for a specific review returns the list of all the edit requests associated with a specific review.  The list is ordered, in descending order, by the expiration date of the modify request, so the user can see first the modify requests that should have been made more recently. 
This List can be retrieved only by the owner of the film or by the reviewer that issued the edit request. For this reason, when the reviews are shown, the hyperlink to access the edit requests for the specific review is displayed only if the user is the owner of the film or the reviewer who issued the edit request.

