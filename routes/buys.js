'use strict';
const express =require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const Buy = require('../models/buy');

router.post('/:shopping_list_Id/users/:userId/candidates/:candidateId',authenticationEnsurer,(req ,res ,next) => {
    const shopping_list_Id = req.params.shopping_list_Id;
    const userId =req.params.userId;
    const candidateId = req.params.candidateId;
    let buy = req.body.buy;
    buy = buy ? parseInt(buy) : 0;
    
    Buy.upsert({
      shopping_list_Id:shopping_list_Id,
      userId: userId,
      candidateId: candidateId,
      buy :buy
    }).then(() =>{
      res.json({ status: 'OK', buy: buy});
    });
  }
);

module.exports = router;