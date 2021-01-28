'use strict';

function ensure(req, res, next) {
  if (req.isAuthenticated()) {//isAuthenticatedは要求が認証されているかどうか　true　or falseで返る
    return next();//認証チェック
  }
  res.redirect('/login');//認証されていない場合は/loginにリダイレクト
}

module.exports = ensure;