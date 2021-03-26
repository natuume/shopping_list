var createError = require('http-errors');
var express = require('express');
var favicon = require('serve-favicon');//ファビコン
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var session = require('express-session');
var passport = require('passport');
// var Strategy = require('passport-twitter').Strategy;//Twitter認証　→エラーで出来なかったので後日。
// var config = require('./config');//Twitterのファイル　config.js

/*モデルの読み込みとモデルの関係のの定義（リレーションの設定） */
// モデルの読み込み
var User = require('./models/user');
var Shopping_list = require('./models/shopping_list');
var Buy = require('./models/buy');
var Candidate = require('./models/candidate');
var Comment = require('./models/comment');

//モデルの関係　　外部キーの設定　（テーブル結合が必要なものだけ）
User.sync().then(() => {
  Shopping_list.belongsTo(User, { foreignKey: 'createdBy' });
  Shopping_list.sync();// 主）User＞従）Shopping_list createByが外部キー　Shopping_listに対応するテーブル作成
  Comment.belongsTo(User, { foreignKey: 'userId' });
  Comment.sync();//主）User＞従）Comment userIdが外部キー　Commentに対応するテーブル作成
  Buy.belongsTo(User, { foreignKey: 'userId' });
  Candidate.sync().then(() => {
    Buy.belongsTo(Candidate, { foreignKey: 'candidateId' });
    Buy.sync();// 主）ユーザー＞従）ショッピングリスト candidateIdが外部キー　Buy(〇✕）に対応するテーブル作成
  });
});
/*GithubのOAuth認証のモジュールとID */
var GitHubStrategy = require('passport-github2').Strategy;
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ||'036409f96cf485310de3';
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '0a411ddc830858c2f545d72c004b144c58a565f9';

passport.serializeUser(function (user, done) {//データ保存
  done(null, user);//処理が終わったらdone関数呼び出し　
});

passport.deserializeUser(function (obj, done) {//データ読み出し
  done(null, obj);
});

//GithubのOAuth認証でCallBackする部分
passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: process.env.HEROKU_URL ? process.env.HEROKU_URL + 'auth/github/callback' : 'http://localhost:8000/auth/github/callback'//情報戻すURL
},
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      User.upsert({
        userId: profile.id,
        username: profile.username
      }).then(() => {
        done(null, profile);
      });
    });
  }
));

//passportの読み込みTwitter、Github共通部分
passport.serializeUser(function(user, cb) {
cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
cb(null, obj);
});
var routes = require('./routes/index');
var login = require('./routes/login');
var logout = require('./routes/logout');
var shopping_lists = require('./routes/shopping_lists');
var buys = require('./routes/buys');
var comments = require('./routes/comments');

// /*Twitter認証のストラテジーモジュール*/
// passport.use(new Strategy({
//   consumerKey: config.twitter.consumerKey,
//   consumerSecret: config.twitter.consumerSecret,
//   callbackURL: config.twitter.callbackURL
// },
// function(token, tokenSecret, profile, cb) {
//   process.nextTick(function () {
//     return cb(null, profile);
//   });
// })
// );

var app = express();
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));//ログへ標準出力
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//認証時のミドルウェア
app.use(session({ secret: 'c1c3cffd938e97b7', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);
app.use('/login', login);
app.use('/logout', logout);
app.use('/shopping_lists', shopping_lists);
app.use('/shopping_lists', buys);
app.use('/shopping_lists', comments);

//Githubの方の認証
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  function (req, res) {
  });

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res) {
    var loginFrom = req.cookies.loginFrom;
    // オープンリダイレクタ脆弱性対策
    if (loginFrom &&
      !loginFrom.includes('http://') &&
      !loginFrom.includes('https://')) {
      res.clearCookie('loginFrom');
      res.redirect(loginFrom);
    } else {
      res.redirect('/');
    }
  });

// //Twitterの方の認証　→Could not authenticate you.になって認証できなかったので、また後日。
// passport.use(new Strategy({
//   consumerKey: config.twitter.consumerKey,
//   consumerSecret: config.twitter.consumerSecret,
//   callbackURL: config.twitter.callbackURL
// },
// function(token, tokenSecret, profile, cb) {
//   process.nextTick(function () {
//     return cb(null, profile);
//   });
// })
// );

// passport.serializeUser(function(user, cb) {
// cb(null, user);
// });

// passport.deserializeUser(function(obj, cb) {
// cb(null, obj);
// });


//   app.get('/login/twitter',
//   passport.authenticate('twitter')
// );

// app.get('/oauth_callback',
//   passport.authenticate('twitter', { failureRedirect: '/' }),
//   function(req, res) {
//     res.redirect('/');
//   }
// );

// app.get('/logout', function (req, res) {
//   req.logout();
//     res.redirect('/');
// });

// function ensureAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) { return next(); }
//   res.redirect('/');
// }

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;