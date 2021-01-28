// →schedules.jsから移行
// お買い物名実装
'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Shopping_list= require('../models/shopping_list');
const Candidate = require ('../models/candidate');

router.get('/new', authenticationEnsurer, (req, res, next) => {
  res.render('new', { user: req.user });
});

router.post('/', authenticationEnsurer, (req, res, next) => {
  const shopping_list_Id = uuid.v4();
  const updatedAt = new Date();
  Shopping_list.create({
    shopping_list_Id: shopping_list_Id,
    shopping_list_Name: req.body.shopping_list_Name.slice(0, 255) || '（名称未設定）',
    memo: req.body.memo,
    createdBy: req.user.id,
    updatedAt: updatedAt
  }).then((shopping_list) => {
    const candidateNames = req.body.candidates.trim().split('\n').map((s) => s.trim()).filter((s) => s !== "");
    const candidates = candidateNames.map((c) => { return {
      candidateName: c,
      shopping_list_Id: shopping_list.shopping_list_Id
    };});
    Candidate.bulkCreate(candidates).then(() => {
          res.redirect('/shopping_lists/' + shopping_list.shopping_list_Id);
    });
  });
});

module.exports = router;

