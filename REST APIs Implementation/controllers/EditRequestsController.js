'use strict'

var utils = require('../utils/writer.js');
var constants = require('../utils/constants.js');
var EditRequests = require('../service/EditRequestsService');
var statuscodes = require('../utils/statuscodes.js');

const DATETIME_REGEX = new RegExp("^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9])(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$");


module.exports.issueEditRequest = function issueEditRequest(req, res, next) {
    // Check if the request body is empty
    if (req.body.deadline == null || req.body.deadline == undefined) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The deadline is missing." }], }, 400);
        return;
    }

    var deadline = req.body.deadline;
    //check if the deadline is in the correct format datetime
    if (DATETIME_REGEX.test(deadline) == false) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The deadline is not in the correct format." }], }, 400);
        return;
    }

    var user = req.user.id;

    //check if the deadline is in the past
    if (new Date(deadline) < new Date()) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The deadline is in the past." }], }, 400);
        return;
    }

    //check if the user is the reviewer of the film (id nel path)
    if (req.params.reviewerId != user) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The user is not the reviewer of the film." }], }, 403);
        return;
    }

    EditRequests.issueEditRequest(req.params.filmId, req.params.reviewerId, deadline)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            if (response == statuscodes.NOT_FOUND) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist' }], }, 404);
            }
            else if (response == statuscodes.CONFLICT) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Review not completed or edit request already present.' }], }, 409);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
}

module.exports.getEditRequests = function getEditRequests(req, res, next) {

    EditRequests.refreshEditRequests();

    EditRequests.getEditRequests(req.params.filmId, req.params.reviewerId, req.user.id)
        .then(function (response) {

            utils.writeJson(res, response);
        })
        .catch(function (response) {
            if (response == statuscodes.NOT_FOUND) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
            }
            else if (response == statuscodes.FORBIDDEN) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is neither the owner nor the reviewer' }], }, 503);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
}

module.exports.getSingleEditRequest = function getSingleEditRequest(req, res, next) {
    EditRequests.getSingleEditRequest(req.params.editRequestId, req.user.id, req.params.filmId, req.params.reviewerId)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            if (response == statuscodes.NOT_FOUND) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The edit request does not exist.' }], }, 404);
            }
            else if (response == statuscodes.FORBIDDEN) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is neither the owner nor the reviewer' }], }, 503);
            }
            else if (response == statuscodes.BAD_REQUEST) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The request is not valid.' }], }, 400);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
}

module.exports.updateEditRequest = function updateEditRequest(req, res, next) {
    // Check if the request body is empty
    if (req.body == null || req.body == undefined) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The request body is empty." }], }, statuscodes.BAD_REQUEST);
        return;
    }
    if (req.body.accepted == null || req.body.accepted == undefined || (req.body.accepted != true && req.body.accepted != false) ) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The accepted field is missing." }], }, statuscodes.BAD_REQUEST);
        return;
    }
    if (req.body.accepted === false) {
        EditRequests.rejectEditRequest(req.params.editRequestId, req.user.id, req.params.filmId, req.params.reviewerId)
            .then(function (response) {
                utils.writeJson(res, response, 204);
            })
            .catch(function (response) {
                if (response == statuscodes.BAD_REQUEST) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The request is not valid.' }], }, 400);
                }
                else if (response == statuscodes.FORBIDDEN) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner' }], }, 403);
                }
                else if (response == statuscodes.NOT_FOUND) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The edit request does not exist.' }], }, 404);
                }
                else if (response == statuscodes.CONFLICT) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The edit request is no more valid.' }] }, 409)
                }
                else {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
                }
            });
    }
    else if (req.body.accepted === true) {
        EditRequests.approveEditRequest(req.params.editRequestId, req.user.id, req.params.filmId, req.params.reviewerId)
            .then(function (response) {
                utils.writeJson(res, response, 204);
            })
            .catch(function (response) {
                if (response == statuscodes.BAD_REQUEST) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The request is not valid.' }], }, 400);
                }
                else if (response == statuscodes.FORBIDDEN) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner' }], }, 403);
                }
                else if (response == statuscodes.NOT_FOUND) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The edit request does not exist.' }], }, 404);
                }
                else if (response == statuscodes.CONFLICT) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The edit request is no more valid.' }] }, 409)
                }
                else {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
                }
            });
    }
    else {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The accepted field must be true or false" }], }, statuscodes.BAD_REQUEST);
        return;
    }
}

module.exports.deleteEditRequest = function deleteEditRequest(req, res, next) {

    EditRequests.deleteEditRequest(req.params.editRequestId, req.user.id, req.params.filmId, req.params.reviewerId)
        .then(function (response) {
            utils.writeJson(res, response, statuscodes.NO_CONTENT);
        })
        .catch(function (response) {
            if (response == statuscodes.NOT_FOUND) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The edit request does not exist.' }], }, 404);
            }
            else if (response == statuscodes.FORBIDDEN) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the reviewer' }], }, 503);
            }
            else if (response == statuscodes.BAD_REQUEST) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The edit request is expired or not pending.' }], }, 400);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
}

module.exports.getPendingEditRequests = function getPendingEditRequests(req, res, next) {

    EditRequests.refreshEditRequests();

    var numOfEditRequests = 0;
    var next = 0;

    EditRequests.getPendingEditRequestsTotal(req.user.id)
        .then(function (response) {
            numOfEditRequests = response;
            EditRequests.getPendingEditRequests(req)
                .then(function (response) {
                    if (req.query.pageNo == null) var pageNo = 1;
                    else var pageNo = req.query.pageNo;

                    var totalPages = Math.ceil(numOfEditRequests / constants.OFFSET);
                    next = Number(pageNo) + 1;
                    if (totalPages == 0) {
                        utils.writeJson(res, {
                            totalPages: totalPages,
                            currentPage: 0,
                            totalItems: numOfEditRequests,
                            editRequests: response
                        });
                    }
                    else if (pageNo > totalPages) {
                        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
                    } else if (pageNo == totalPages) {
                        utils.writeJson(res, {
                            totalPages: totalPages,
                            currentPage: pageNo,
                            totalItems: numOfEditRequests,
                            editRequests: response
                        });
                    } else {
                        utils.writeJson(res, {
                            totalPages: totalPages,
                            currentPage: pageNo,
                            totalItems: numOfEditRequests,
                            editRequests: response,
                            next: "/api/films/public/reviews/editRequests/received?pageNo=" + next
                        });
                    }
                })
                .catch(function (response) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
                });
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        });
};

module.exports.getSentEditRequests = function getSentEditRequests(req, res, next) {

    EditRequests.refreshEditRequests();

    var numOfEditRequests = 0;
    var next = 0;

    EditRequests.getSentEditRequestsTotal(req.user.id)
        .then(function (response) {
            numOfEditRequests = response;
            EditRequests.getSentEditRequests(req)
                .then(function (response) {
                    if (req.query.pageNo == null) var pageNo = 1;
                    else var pageNo = req.query.pageNo;

                    var totalPages = Math.ceil(numOfEditRequests / constants.OFFSET);
                    next = Number(pageNo) + 1;
                    if (totalPages == 0) {
                        utils.writeJson(res, {
                            totalPages: totalPages,
                            currentPage: 0,
                            totalItems: numOfEditRequests,
                            editRequests: response
                        });
                    }
                    else if (pageNo > totalPages) {
                        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
                    } else if (pageNo == totalPages) {
                        utils.writeJson(res, {
                            totalPages: totalPages,
                            currentPage: pageNo,
                            totalItems: numOfEditRequests,
                            editRequests: response
                        });
                    } else {
                        utils.writeJson(res, {
                            totalPages: totalPages,
                            currentPage: pageNo,
                            totalItems: numOfEditRequests,
                            editRequests: response,
                            next: "/api/films/public/reviews/editRequests/sent?pageNo=" + next
                        });
                    }
                })
                .catch(function (response) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
                });
        })
        .catch(function (response) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        });
}

