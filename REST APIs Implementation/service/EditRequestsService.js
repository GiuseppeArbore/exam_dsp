'use strict';

const EditRequest = require('../components/editRequest');
const db = require('../components/db');
var constants = require('../utils/constants.js');
var status = require('../utils/statuscodes.js');

/**
 * Issue an edit request for the review of the film with ID filmId and issued to user with reviewerId
 * 
 * Input:
 * - filmId: the ID of the film whose review needs to be edited
 * - reviewerId: the ID of the reviewer whose review needs to be edited
 * - deadline: the deadline for the edit request
 * Output:
 * - the edit request
 * 
 * **/
exports.issueEditRequest = function (filmId, reviewerId, deadline) {
    return new Promise((resolve, reject) => {

        // Check if the review exists
        const sql1 = "SELECT * FROM reviews WHERE filmId = ? AND reviewerId = ?";
        db.get(sql1, [filmId, reviewerId], (err, row) => {
            if (err) {
                return reject(err);
            }
            else if (!row) {
                return reject(status.NOT_FOUND);
            }   //we don't need to check the reviewerId because we are filtering it in the query
            else if (row.completed === 0) {
                return reject(status.CONFLICT);
            }
            else {
                // Check if there is a pending edit request
                const sql2 = "SELECT * FROM editRequests WHERE filmId = ? AND reviewerId = ? AND status = 'Pending'";
                db.all(sql2, [filmId, reviewerId], (err, rows) => {
                    if (err) {
                        reject(err);
                    }
                    else if (rows.length > 0 && !checkAllExpired(rows)) {
                        reject(status.CONFLICT);
                    }
                    else {
                        // Insert the edit request
                        const sql3 = "INSERT INTO editRequests(id, filmId, reviewerId,status, deadline) VALUES(?, ?, ?, ?, ?)";
                        db.run(sql3, [this.lastID, filmId, reviewerId, "Pending", deadline], function (err) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                const editRequest = new EditRequest(this.lastID, filmId, reviewerId, deadline, 'Pending');
                                resolve(editRequest);
                            }
                        });
                    }
                });
            }

        });
    });
};

/**
 * get all the edit requests for the review of the film with ID filmId and issued from user with reviewerId
 * - can be called only by the owner of the film or the reviewer
 * 
 * Input:
 * - filmId: the ID of the film whose review needs to be edited
 * - reviewerId: the ID of the reviewer whose review needs to be edited
 * - userId: the ID of the user who is requesting the edit request
 * 
 * Output:
 * - the list of edit requests
 * 
 */
exports.getEditRequests = function (filmId, reviewerId, userId) {

    return new Promise((resolve, reject) => {
        // Check if the user is the reviewer or the owner
        if (reviewerId != userId) {
            const sql0 = "SELECT owner FROM films WHERE id = ?"
            db.get(sql0, [filmId], (err, row) => {
                if (err) {
                    reject(err);
                }
                else if (row.owner != userId)
                    reject(status.FORBIDDEN);
            });
        }

        const sql1 = "SELECT * FROM editRequests WHERE filmId = ? AND reviewerId = ? ORDER BY deadline DESC";

        db.all(sql1, [filmId, reviewerId], (err, rows) => {
            if (err) {
                reject(err);
            }
            else if (rows.length === 0) {
                reject(status.NOT_FOUND);
            }
            else {
                var editRequests = rows.map(row => new EditRequest(row.id, row.filmId, row.reviewerId, row.deadline, row.status));
                resolve(editRequests);
            }
        });
    });
}

/**
 * Retrieve a single edit request
 *   - can be called only by the owner of the film or the reviewer
 * 
 * Input:
 * - editRequestId: the ID of the edit request
 * - userId: the ID of the user who is requesting the edit request
 * - filmId: the ID of the film whose review needs to be edited
 * - reviewerId: the ID of the reviewer whose review needs to be edited
 * 
 * Output:
 * - the edit request
 * 
 */
exports.getSingleEditRequest = function (editRequestId, userId, filmId, reviewerId) {
    return new Promise((resolve, reject) => {
        // Check if the edit request exists
        const sql1 = "SELECT * FROM editRequests WHERE id = ?";
        db.get(sql1, [editRequestId], (err, row1) => {
            if (err) {
                reject(err);
            }
            else if (!row1) {
                reject(status.NOT_FOUND);
            } else if (row1.filmId != filmId || row1.reviewerId != reviewerId) {
                reject(status.BAD_REQUEST);
            }
            else {
                // Check if the user is the owner of the film
                if (row1.reviewerId !== userId) {
                    const sql2 = "SELECT * FROM films WHERE id = ? AND owner = ?";
                    db.get(sql2, [row1.filmId, userId], (err, row) => {
                        if (err) {
                            reject(err);
                        }
                        else if (!row) {
                            reject(status.FORBIDDEN);
                        }
                        else {
                            var editRequest = new EditRequest(row1.id, row1.filmId, row1.reviewerId, row1.deadline, row1.status);
                            editRequest = updateSingleExpiredEditRequest(editRequest);
                            resolve(editRequest);
                        }
                    });
                }   // If the user is the reviewer
                else {
                    var editRequest = new EditRequest(row1.id, row1.filmId, row1.reviewerId, row1.deadline, row1.status);
                    editRequest = updateSingleExpiredEditRequest(editRequest);
                    resolve(editRequest);
                }
            }
        });
    });
}


/**
 * Approve the edit request with ID editRequestId, can be called only by the owner of the film
 * 
 * Input:
 * - editRequestId: the ID of the edit request
 * - userId: the ID of the user who is approving the request
 * - filmId: the ID of the film whose review needs to be edited
 * - reviewerId: the ID of the reviewer whose review needs to be edited
 * 
 * Output:
 * - None
 * 
 * Effects:
 *  - the status of the edit request is updated to 'Approved'
 * - the completed field of the review is updated to 0
 * 
 * */
exports.approveEditRequest = function (editRequestId, userId, filmId, reviewerId) {
    return new Promise((resolve, reject) => {
        // Check if the film exists and the user is the owner
        const sql0 = "SELECT * FROM films WHERE id = ?";
        db.get(sql0, [filmId], (err, row) => {
            if (err) {
                reject(err);
            }
            else if (!row) {
                reject(status.NOT_FOUND);
            }
            else if (row.owner !== userId) {
                reject(status.FORBIDDEN);
            } else {

                // Check if the edit request exists
                const sql1 = "SELECT * FROM editRequests WHERE id = ?";
                db.get(sql1, [editRequestId], (err, row) => {
                    if (err) {
                        reject(err);
                    }
                    else if (!row) {
                        reject(status.NOT_FOUND);
                    }
                    else if (row.filmId != filmId || row.reviewerId != reviewerId) {
                        reject(status.BAD_REQUEST);
                    }
                    else if (row.status !== 'Pending' || new Date(row.deadline) < new Date()) {
                        reject(status.CONFLICT);
                    }
                    else {
                        const editRequest = row;

                        // Update the status of the edit request and the completed film of the review
                        const sql3 = "UPDATE editRequests SET status = 'Approved' WHERE id = ?";
                        db.run(sql3, [editRequestId], function (err) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                const sql4 = "UPDATE reviews SET completed = 0 WHERE filmId = ? AND reviewerId = ?";
                                db.run(sql4, [editRequest.filmId, editRequest.reviewerId], function (err) {
                                    if (err) {
                                        reject(err);
                                    }
                                    else {
                                        resolve();
                                    }
                                });

                            }
                        });
                    }
                });

            }
        });

    });
}


/**
 * Reject the edit request with ID editRequestId, can be called only by the owner of the film
 * 
 * Input:
 * - editRequestId: the ID of the edit request
 * - userId: the ID of the user who is rejecting the request
 * - filmId: the ID of the film whose review needs to be edited
 * - reviewerId: the ID of the reviewer whose review needs to be edited
 * 
 * Output:
 * - None
 * 
 * Effects:
 * - the status of the edit request is updated to 'Rejected'
 * 
 * */
exports.rejectEditRequest = function (editRequestId, userId, filmId, reviewerId) {
    return new Promise((resolve, reject) => {
        // Check if the film exists and the user is the owner
        const sql0 = "SELECT * FROM films WHERE id = ?";
        db.get(sql0, [filmId], (err, row) => {
            if (err) {
                reject(err);
            }
            else if (!row) {
                reject(status.NOT_FOUND);
            }
            else if (row.owner !== userId) {
                reject(status.FORBIDDEN);
            } else {
                // Check if the edit request exists
                const sql1 = "SELECT * FROM editRequests WHERE id = ?";
                db.get(sql1, [editRequestId], (err, row) => {
                    if (err) {
                        reject(err);
                    }
                    else if (!row) {
                        reject(status.NOT_FOUND);
                    }
                    else if (row.filmId != filmId || row.reviewerId != reviewerId) {
                        reject(status.BAD_REQUEST);
                    }
                    else if (row.status !== 'Pending' || new Date(row.deadline) < new Date()) {
                        reject(status.CONFLICT);
                    }
                    else {
                        // Check if the user is the owner of the film
                        const sql2 = "SELECT * FROM films WHERE id = ? AND owner = ?";
                        db.all(sql2, [row.filmId, userId], (err, rows) => {
                            if (err) {
                                reject(err);
                            }
                            else if (rows.length === 0) {
                                reject(status.FORBIDDEN);
                            }
                            else {
                                // Update the status of the edit request
                                const sql3 = "UPDATE editRequests SET status = 'Rejected' WHERE id = ?";
                                db.run(sql3, [editRequestId], function (err) {
                                    if (err) {
                                        reject(err);
                                    }
                                    else {
                                        resolve();
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });
}


/**
 * delete a single edit request
 * 
 * constraints:
 * - only the reviewer can delete the edit request
 * - edit request must be pending and not expired
 * 
 * Input:
 * - editRequestId: the ID of the edit request
 * - userId: the ID of the user who is deleting the request
 * - filmId: the ID of the film whose review needs to be edited
 * - reviewerId: the ID of the reviewer whose review needs to be edited
 * 
 * Output:
 * - no response expected for this operation
 * 
 * */
exports.deleteEditRequest = function (editRequestId, userId, filmId, reviewerId) {
    return new Promise((resolve, reject) => {
        // Check if the edit request exists
        const sql1 = "SELECT * FROM editRequests WHERE id = ?";
        db.get(sql1, [editRequestId], (err, row) => {
            if (err) {
                reject(err);
            }
            else if (!row) {
                reject(status.NOT_FOUND);
            }
            else if (row.filmId != filmId || row.reviewerId != reviewerId) {
                reject(status.BAD_REQUEST);
            }
            else {
                // Check if the user is the reviewer
                if (row.reviewerId !== userId) {
                    reject(status.FORBIDDEN);
                }
                else if (row.status !== 'Pending' || new Date(row.deadline) < new Date()) {
                    reject(status.BAD_REQUEST);
                }
                else {
                    // Delete the edit request
                    const sql2 = "DELETE FROM editRequests WHERE id = ?";
                    db.run(sql2, [editRequestId], function (err) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(null);
                        }
                    });
                }
            }
        });
    });

};


/** 
 * Get all the pending edit requests review for the film owned by the user with ID ownerId
 * 
 * Input:
 * - ownerId: the ID of the owner of the film
 * Output:
 * - the list of pending edit requests for the films owned by ownerId
 * 
 * */
exports.getPendingEditRequests = function (req) {
    return new Promise((resolve, reject) => {
        var sql = "SELECT * FROM editRequests WHERE filmId IN (SELECT id FROM films WHERE owner = ?) AND status = 'Pending' ORDER BY deadline ASC";

        var params = getPagination(req)
        if (params.length != 1) sql += " LIMIT ?,?";

        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                const editRequests = rows.map(row => new EditRequest(row.id, row.filmId, row.reviewerId, row.deadline, row.status));
                resolve(editRequests);
            }
        });
    });

};

/**
 * Retrieve the number of edit review requests of the film owned by ownerId

 * Input: 
* - ownerId: the ID of the user who has has to answer
 * Output:
 * - total number of edit review requests pending for films owner by ownerId
 * 
 **/
exports.getPendingEditRequestsTotal = function (ownerId) {
    return new Promise((resolve, reject) => {
        var sqlNumOfRequests = "SELECT count(*) total FROM editRequests WHERE filmId IN (SELECT id FROM films WHERE owner = ?) AND status = 'Pending'";
        db.get(sqlNumOfRequests, [ownerId], (err, size) => {
            if (err) {
                reject(err);
            } else {
                resolve(size.total);
            }
        });
    });
};


/** 
 * Get all th edit review requests sent by the reviewer
 *  
 * Output:
 * - the list of edit requests sent by the reviewer
 * 
 * */
exports.getSentEditRequests = function (req) {
    return new Promise((resolve, reject) => {
        var sql = "SELECT * FROM editRequests WHERE reviewerId = ? ORDER BY deadline DESC";
        var params = getPagination(req)
        if (params.length != 1) sql += " LIMIT ?,?";

        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                const editRequests = rows.map(row => new EditRequest(row.id, row.filmId, row.reviewerId, row.deadline, row.status));
                resolve(editRequests);
            }
        });
    });

};

/**
 * Retrieve the number of edit review requests sent by the reviewer
 * 
 * Output:
 * - total number of edit review requests sent by the reviewer

 * 
 **/
exports.getSentEditRequestsTotal = function (reviewerId) {
    return new Promise((resolve, reject) => {
        var sqlNumOfRequests = "SELECT count(*) total FROM editRequests WHERE reviewerId = ? ";
        db.get(sqlNumOfRequests, [reviewerId], (err, size) => {
            if (err) {
                reject(err);
            } else {
                resolve(size.total);
            }
        });
    });
};


/**
 * Refresh the edit requests
 * - Check if the edit requests are expired and update the status
 * 
 * */
exports.refreshEditRequests = function () {
    const sql = "SELECT * FROM editRequests WHERE status = 'Pending'";
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.log(err);
        }
        else {
            const expired = rows.filter(row => new Date(row.deadline) < new Date());
            expired.forEach(row => {
                const sql = "UPDATE editRequests SET status = 'Rejected' WHERE id = ?";
                db.run(sql, [row.id], function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
            });
        }
    });
}


/**
 * Utility functions
 */
const getPagination = function (req) {
    var pageNo = parseInt(req.query.pageNo);
    var size = parseInt(constants.OFFSET);
    var limits = [];
    limits.push(req.user.id);
    if (req.query.pageNo == null) {
        pageNo = 1;
    }
    limits.push(size * (pageNo - 1));
    limits.push(size);
    return limits;
}

// Check if all the edit requests are expired
const checkAllExpired = function (rows) {
    const not_expired = rows.filter(row => new Date(row.deadline) > new Date());
    return not_expired.length === 0;
}

// Update the status of the expired pending edit requests -> Rejected
const updateSingleExpiredEditRequest = function (editRequest) {
    if (new Date(editRequest.deadline) < new Date()) {
        const sql = "UPDATE editRequests SET status = 'Rejected' WHERE id = ?";
        db.run(sql, [editRequest.id], function (err) {
            if (err) {
                console.log(err);
            }
        });
        return { ...editRequest, status: 'Rejected' };
    }
    return editRequest;
}
