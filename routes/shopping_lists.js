'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Shopping_list= require('../models/shopping_list');
const Candidate = require ('../models/candidate');
const User = require('../models/user');
const Buy =require('../models/buy');
const Comment =require('../models/comment');


router.get('/new', authenticationEnsurer, (req, res, next) => {
  res.render('new', { user: req.user });
});

router.post('/', authenticationEnsurer, (req, res, next) => {
  const shopping_list_Id = uuid.v4();//ID生成
  const updatedAt = new Date();//更新日時生成

  //Shopping_Listをデータベース内に保存
  Shopping_list.create({
    shopping_list_Id: shopping_list_Id,//ID
    shopping_list_Name: req.body.shopping_list_Name.slice(0, 255) || '（名称未設定）',//名前。データベース上の長さ制限のため255文字制限 ||で空の文字を名称未設定に設定。
    memo: req.body.memo,//メモ
    createdBy: req.user.id,//USER ID
    updatedAt: updatedAt//更新日時
  }).then((shopping_list) => {//上記の内容保存し終わったら実行
    createCandidatesAndRedirect
    (parseCandidateNames(req),
    shopping_list_Id,res);
    });
  });
  
//sequelzeを利用してテーブル結合してユーザーを取得
router.get('/:shopping_list_Id', authenticationEnsurer, (req, res, next) => {
  let storedShopping_list= null;
  let storedCandidates =null;
  Shopping_list.findOne({//findOneはデータを1行だけ取得
    include: [
      {
        model: User,//modelからUser(ユーザー情報）を
        attributes: ['userId', 'username']//attributes=属性 userIdとusername
      }],
    where: {
      shopping_list_Id: req.params.shopping_list_Id//shopping_list_Idにshopping_list_Idのパラメーターをリクエスト
    },
    order: [['updatedAt', 'DESC']]//更新日時を　昇順に並べ替え
  }).then((shopping_list) => {
    if (shopping_list) {
      storedShopping_list = shopping_list;
      return Candidate.findAll({//Candidate（候補）をfindAll(全て取得)
        where: { shopping_list_Id: shopping_list.shopping_list_Id },
        order: [['candidateId', 'ASC']]//candidateIdをASC（昇順）にソート
      });
    }else{
      const err =new Error('指定された予定は見つかりません');
      err.status =404;
      next(err);
    }
  })
  .then((candidates) => {
  //データベースからその予定の全ての〇✕を取得する
  storedCandidates = candidates;
  return Buy.findAll({
    include:[
      {
        model: User,
        attributes: ['userId','username']
      }
    ],
    where:{ shopping_list_Id:storedShopping_list.shopping_list_Id },
    order:[
      [User,'username','ASC'],
      ['candidateId','ASC']
    ]
  });
  }).then((buys) => {
    // 〇✕（買った買わない）MapMap(キー:ユーザー ID, 値:〇✕Map(キー:候補 ID, 値:〇✕)) を作成する
    const buyMapMap = new Map(); // key: userId, value: Map(key: candidateId, buy)
      buys.forEach((a) => {//forEachで格納したアイテムにコールバック関数を実行
        const map = buyMapMap.get(a.user.userId) || new Map();
        map.set(a.candidateId, a.buy);//買った買わないデータがあったものだけ
          buyMapMap.set(a.user.userId, map);//データとして入れ子の連想配列に保存
        });

// 閲覧ユーザーと〇✕に紐づくユーザーからユーザー Map (キー:ユーザー ID, 値:ユーザー) を作る
    const userMap = new Map(); // key: userId, value: User
    userMap.set(parseInt(req.user.id), {
      isSelf: true,
      userId: parseInt(req.user.id),
      username: req.user.username
    });
    buys.forEach((a) => {
      userMap.set(a.user.userId, {
        isSelf: parseInt(req.user.id) === a.user.userId, // 閲覧ユーザー自身であるかを含める
        userId: a.user.userId,
        username: a.user.username
    });
  });
  // 全ユーザー、全候補で二重ルーしてそれぞれの〇✕の値がない場合には、「〇✕」を設定する
      const users = Array.from(userMap).map((keyValue) => keyValue[1]);
      users.forEach((u) => {
        storedCandidates.forEach((c) => {
          const map = buyMapMap.get(u.userId) || new Map();
          const a = map.get(c.candidateId) || 0; // デフォルト値は 0 を利用
          map.set(c.candidateId, a);
        buyMapMap.set(u.userId, map);
        });
      });

  //コメント取得
  return Comment.findAll({
    where:{ shopping_list_Id: storedShopping_list.shopping_list_Id }
  }).then((comments) => {
    const commentMap = new Map(); //key: userId, value: comment
    comments.forEach(comment =>{
      commentMap.set(comment.userId, comment.comment);
    });
    res.render('shopping_list',{
      user: req.user,
      shopping_list:storedShopping_list,
      candidates:storedCandidates,
      users:users,
      buyMapMap:buyMapMap,
      commentMap: commentMap
      });
    });
  });
});
//編集フォーム関連
router.get('/:shopping_list_Id/edit', authenticationEnsurer, (req, res, next) => {//URLは表示ページの末尾に/editを加えたもの
  Shopping_list.findOne({//Idの中身を取得
    where: {
      shopping_list_Id: req.params.shopping_list_Id
    }
  }).then((shopping_list) => {
    if (isMine(req, shopping_list)) { // 作成者のみが編集フォームを開ける　isMine=自分の
      Candidate.findAll({//候補の取得　とテンプレートedit出す
        where: { shopping_list_Id: shopping_list.shopping_list_Id },
        order: [['"candidateId"', 'ASC']]//ASC　昇順
      }).then((candidates) => {
        res.render('edit', {
          user: req.user,
          shopping_list: shopping_list,
          candidates: candidates
        });
      });
    } else {
      const err = new Error('指定された予定がない、または、予定する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

function isMine(req, shopping_list) {
  return shopping_list && parseInt(shopping_list.createdBy) === parseInt(req.user.id);
}//　リストが自分のものであるか真偽値を返す　parseInt=文字列を整数に変換　&&＝アンド　

router.post('/:shopping_list_Id', authenticationEnsurer, (req, res, next) => {
  Shopping_list.findOne({
    where: {
      shopping_list_Id: req.params.shopping_list_Id
    }
  }).then((shopping_list) => {
    if (shopping_list && isMine(req, shopping_list)) {
      if (parseInt(req.query.edit) === 1) {
        const updatedAt = new Date();
        shopping_list.update({
          shopping_list_Id: shopping_list.shopping_list_Id,
          shopping_list_Name: req.body.shopping_list_Name.slice(0, 255) || '（名称未設定）',
          memo: req.body.memo,
          createdBy: req.user.id,
          updatedAt: updatedAt
        }).then((shopping_list) => {
          // 追加されているかチェック
          const candidateNames = parseCandidateNames(req);
          if (candidateNames) {
            createCandidatesAndRedirect(candidateNames, shopping_list.shopping_list_Id, res);
          } else {
            res.redirect('/shopping_lists/' + shopping_list.shopping_list_Id);
          }
        });
      } else if (parseInt(req.query.delete) === 1) {
        deleteShopping_ListAggregate(req.params.shopping_list_Id, () => {
          res.redirect('/');
        });
      } else {
        const err = new Error('不正なリクエストです');
        err.status = 400;
        next(err);
      }
    } else {
      const err = new Error('指定された予定がない、または、編集する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

function deleteShopping_ListAggregate(shopping_list_Id, done, err) {
  const promiseCommentDestroy = Comment.findAll({
    where: { shopping_list_Id: shopping_list_Id }
  }).then((comments) => {
    return Promise.all(comments.map((c) => { return c.destroy(); }));
  });

  Buy.findAll({
    where: { shopping_list_Id: shopping_list_Id }
  }).then((buys) => {
    const promises = buys.map((a) => { return a.destroy(); });
    return Promise.all(promises);
  }).then(() => {
    return Candidate.findAll({
      where: { shopping_list_Id: shopping_list_Id }
    });
  }).then((candidates) => {
    const promises = candidates.map((c) => { return c.destroy(); });
    promises.push(promiseCommentDestroy);
    return Promise.all(promises);
  }).then(() => {
    return Shopping_list.findByPk(shopping_list_Id).then((s) => { return s.destroy(); });
  }).then(() => {
    if (err) return done(err);
    done();
  });
}

router.deleteShopping_ListAggregate = deleteShopping_ListAggregate;

function createCandidatesAndRedirect(candidateNames, shopping_list_Id, res) {
  const candidates = candidateNames.map((c) => {
    return {
      candidateName: c,
      shopping_list_Id: shopping_list_Id
    };
  });
  Candidate.bulkCreate(candidates).then(() => {
    res.redirect('/shopping_lists/' + shopping_list_Id);
  });
}

function parseCandidateNames(req) {
  return req.body.candidates.trim().split('\n').map((s) => s.trim()).filter((s) => s !== "");
}

module.exports = router;

