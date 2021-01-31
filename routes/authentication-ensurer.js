'use strict';

function ensure(req, res, next) {
  if (req.isAuthenticated()) {//isAuthenticatedは要求が認証されているかどうか　true　or falseで返る
    return next();//認証チェック
  }
  res.redirect('/login?from=' + req.originalUrl);//認証されていない場合はどこにアクセスしようとしたかを、 /login のクエリに含めた形でリダイレクト
}

module.exports = ensure;