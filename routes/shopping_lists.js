'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Shopping_list = require('../models/shopping_list');
const Candidate = require('../models/candidate');
const User = require('../models/user');
const Buy = require('../models/buy');
const Comment = require('../models/comment');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

router.get('/new', authenticationEnsurer, csrfProtection, (req, res, next) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const shopping_list_Id = uuid.v4();//UUID生成
  const updatedAt = new Date();//更新日時生成
  Shopping_list.create({
    shopping_list_Id: shopping_list_Id,
    shopping_list_Name: req.body.shopping_list_Name.slice(0, 255) || '（名称未設定）',
    memo: req.body.memo,
    createdBy: req.user.id,
    updatedAt: updatedAt
  }).then((shopping_list) => {
    createCandidatesAndRedirect(parseCandidateNames(req), shopping_list_Id, res);
  });
});

router.get('/:shopping_list_Id', authenticationEnsurer, (req, res, next) => {
  let storedShopping_list = null;
  let storedCandidates = null;
  Shopping_list.findOne({
    include: [
      {
        model: User,
        attributes: ['userId', 'username']
      }],
    where: {
      shopping_list_Id: req.params.shopping_list_Id
    },
    order: [['updatedAt', 'DESC']]
  }).then((shopping_list) => {
    //データベースからお買い物リストとIDを取得する
    if (shopping_list) {
      storedShopping_list = shopping_list;
      return Candidate.findAll({
        where: { shopping_list_Id: shopping_list.shopping_list_Id },
        order: [['candidateId', 'ASC']]
      });
    } else {
      const err = new Error('指定されたリストは見つかりません');
      err.status = 404;
      next(err);
    }
  }).then((candidates) => {
    // データベースからその予定の全ての〇✕を取得する
    storedCandidates = candidates;
    return Buy.findAll({
      include: [
        {
          model: User,
          attributes: ['userId', 'username']
        }
      ],
      where: { shopping_list_Id: storedShopping_list.shopping_list_Id },
      order: [[User, 'username', 'ASC'], ['"candidateId"', 'ASC']]
    });
  }).then((buys) => {
    // 〇✕ MapMap(キー:ユーザー ID, 値:〇✕Map(キー:候補 ID, 値:出欠)) を作成する
    const buyMapMap = new Map(); // key: userId, value: Map(key: candidateId, buy)
    buys.forEach((a) => {
      const map = buyMapMap.get(a.user.userId) || new Map();
      map.set(a.candidateId, a.buy);
      buyMapMap.set(a.user.userId, map);
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

    // 全ユーザー、全候補で二重ループしてそれぞれの〇✕の値がない場合には、「✕」を設定する
    const users = Array.from(userMap).map((keyValue) => keyValue[1]);
    users.forEach((u) => {
      storedCandidates.forEach((c) => {
        const map = buyMapMap.get(u.userId) || new Map();
        const a = map.get(c.candidateId) || 0; // デフォルト値は 0 を利用
        map.set(c.candidateId, a);
        buyMapMap.set(u.userId, map);
      });
    });

    // コメント取得
    return Comment.findAll({
      where: { shopping_list_Id: storedShopping_list.shopping_list_Id }
    }).then((comments) => {
      const commentMap = new Map();  // key: userId, value: comment
      comments.forEach((comment) => {
        commentMap.set(comment.userId, comment.comment);
      });
      res.render('shopping_list', {
        user: req.user,
        shopping_list: storedShopping_list,
        candidates: storedCandidates,
        users: users,
        buyMapMap: buyMapMap,
        commentMap: commentMap
      });
    });
  });
});

//予定編集フォーム
router.get('/:shopping_list_Id/edit', authenticationEnsurer, csrfProtection, (req, res, next) => {
  Shopping_list.findOne({//Shopping_listからShopping_listのIDを取得
    where: {
      shopping_list_Id: req.params.shopping_list_Id
    }
  }).then((shopping_list) => {
    if (isMine(req, shopping_list)) { // 作成者のみが編集フォームを開ける
      Candidate.findAll({//Candidateから以下のものを探す
        where: { shopping_list_Id: shopping_list.shopping_list_Id },
        order: [['"candidateId"', 'ASC']]//ショッピングリストのIdを　ASC=昇順に並べる（作成順に並べ替え）
      }).then((candidates) => {//候補を取得
        res.render('edit', {
          user: req.user,
          shopping_list: shopping_list,
          candidates: candidates,
          csrfToken: req.csrfToken()//CSRF対策
        });
      });
    } else {
      const err = new Error('指定されたリストがない、または、リストをつくる権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

function isMine(req, shopping_list) {
  return shopping_list && parseInt(shopping_list.createdBy) === parseInt(req.user.id);//リクエストと予定のオブジェクトを受け取り真偽値を返す
}
//予定編集の反映
router.post('/:shopping_list_Id', authenticationEnsurer, csrfProtection, (req, res, next) => {
  Shopping_list.findOne({//Shopping_list IDの取得
    where: {
      shopping_list_Id: req.params.shopping_list_Id
    }
  }).then((shopping_list) => {
    if (shopping_list && isMine(req, shopping_list)) {
      if (parseInt(req.query.edit) === 1) {//editのクエリがあるときのみ更新
        const updatedAt = new Date();
        shopping_list.update({
          shopping_list_Id: shopping_list.shopping_list_Id,
          shopping_list_Name: req.body.shopping_list_Name.slice(0, 255) || '（名称未設定）',
          memo: req.body.memo,
          createdBy: req.user.id,
          updatedAt: updatedAt//Shopping_list名、メモ、作成者、更新日時を更新
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
        deleteShopping_listAggregate(req.params.shopping_list_Id, () => {
          res.redirect('/');
        });
      } else {
        const err = new Error('不正なリクエストです');
        err.status = 400;
        next(err);
      }
    } else {
      const err = new Error('指定されたリストがない、または、編集する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

function deleteShopping_listAggregate(shopping_list_Id, done, err) {
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

router.deleteShopping_listAggregate = deleteShopping_listAggregate;

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
