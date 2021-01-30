'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const Comment = require('../models/comment');

router.post(
  '/:shopping_list_Id/users/:userId/comments',
  authenticationEnsurer,
  (req, res, next) => {
    const shopping_list_Id = req.params.shopping_list_Id;
    const userId = req.params.userId;
    const comment = req.body.comment;

    Comment.upsert({
      shopping_list_Id: shopping_list_Id,
      userId: userId,
      comment: comment.slice(0, 255)
    }).then(() => {
      res.json({ status: 'OK', comment: comment });
    });
  }
);

module.exports = router;