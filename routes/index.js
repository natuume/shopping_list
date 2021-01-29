'use strict';

const express = require('express');
const router = express.Router();
const Shopping_list = require('../models/shopping_list');

/* GET home page. */
router.get('/', function(req, res, next) {
  const title ='お買い物リスト';//タイトル　変えるときはこちらから
  if(req.user) {
    Shopping_list.findAll({//findAllはSequalizeの関数。条件が合うレコードを全て取得
      where: {//WHERE句　検索対象を絞り込む
        createdBy:req.user.id//req.userオブジェクトの有無で処理全体を認証済みか確認
      },
      order: [['updatedAt','DESC']]//DESCは降順ASCは昇順 Orderはソート 作成日時順にソート
    }).then(shopping_lists => {
      res.render('index',{
        title: title,
        user: req.user,
        shopping_lists: shopping_lists
      });
    });
  } else {
  res.render('index', { title: 'Express', user: req.user });
  }
});

module.exports = router;
