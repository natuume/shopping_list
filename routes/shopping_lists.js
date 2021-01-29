// お買い物名実装
'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Shopping_list= require('../models/shopping_list');
const Candidate = require ('../models/candidate');
const User = require('../models/user');
const Buy =require('../models/buy');

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
    const candidateNames = req.body.candidates.trim().split('\n').map((s) => s.trim()).filter((s) => s !== "");//候補の配列を取得
    const candidates = candidateNames.map((c) => { return {
      candidateName: c,
      shopping_list_Id: shopping_list.shopping_list_Id
    };});//candidateオブジェクト作成
    Candidate.bulkCreate(candidates).then(() => {
          res.redirect('/shopping_lists/' + shopping_list.shopping_list_Id);
    });//blukCreate関数はsequelizeの複数のオブジェクトを保存する関数。処理が終わったら「/shopping_lists/：shopping_list_Id」へリダイレクト
  });
});

//sequelzeを利用してテーブル結合してユーザーを取得
router.get('/:shopping_list_Id', authenticationEnsurer, (req, res, next) => {
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
      Candidate.findAll({//Candidate（候補）をfindAll(全て取得)
        where: { shopping_list_Id: shopping_list.shopping_list_Id },
        order: [['candidateId', 'ASC']]//candidateIdをASC（昇順）にソート
      }).then((candidates) => {
          // res.render('shopping_list', {//上の処理が終わったらshopping_listにレンダリング
          //     user: req.user,
          //     shopping_list: shopping_list,
          //     candidates: candidates,
          //     users: [req.user]
          // データベースからその予定の全ての出欠を取得する
        Buy.findAll({//Buyから買う買わないを取得
          include: [
            {
              model: User,
              attributes: ['userId', 'username']
            }
          ],
          where: { shopping_list_Id: shopping_list.shopping_list_Id },
          order: [[User, 'username', 'ASC'], ['candidateId', 'ASC']]
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

          // 全ユーザー、全候補で二重ループしてそれぞれの〇✕の値がない場合には、「〇✕」を設定する
          const users = Array.from(userMap).map((keyValue) => keyValue[1]);
          users.forEach((u) => {
            candidates.forEach((c) => {
              const map = buyMapMap.get(u.userId) || new Map();
              const a = map.get(c.candidateId) || 0; // デフォルト値は 0 を利用
              map.set(c.candidateId, a);
              buyMapMap.set(u.userId, map);
            });
          });
          res.render('shopping_list', {//レンダリング
            user: req.user,
            shopping_list: shopping_list,
            candidates: candidates,
            users: users,
            buyMapMap: buyMapMap
          });
        });
      });
    } else {
      const err = new Error('指定された予定は見つかりません');
      err.status = 404;
      next(err);//予定が見つからなかったら404
    }
  });
});
module.exports = router;

