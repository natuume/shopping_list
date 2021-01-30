var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');//セキュリティ対策モジュール
var session = require('express-session');//認証したセッション情報を維持
var passport = require('passport');//外部認証を組み込むためのプラットフォームライブラリ

// データベースからモデルの読み込み 
var User = require('./models/user');// models/user.js
var Shopping_list= require('./models/shopping_list');// models/shopping_list_js
var Buy = require('./models/buy');// models/buy.js
var Candidate = require('./models/candidate');//models/candidate.js
var Comment = require('./models/comment');//models/comment.js

User.sync().then(() => {//sync関数でデータベースのテーブル呼び出し。Userに対応するテーブルの作成が終わった後に実行処理を以下に無名関数で記述
  Shopping_list.belongsTo(User,{foreignKey: 'createdBy'});
  Shopping_list.sync();
  //従属エンティティ設定。createdByでUserの外部キーであることを設定。Shopping_listに対応するテーブル作成
  Comment.belongsTo(User,{foreignKey: 'userId'});
  Comment.sync();
  //CommentがUserに従属していることを定義 Commentに対するテーブル作成
  Buy.belongsTo(User,{foreignKey:'userId'});
  //BuyがUserに従属していることを定義
  Candidate.sync().then(() =>{
    //お買い物候補に対するテーブルを作成。
    Buy.belongsTo(Candidate,{foreignKey:'candidateId'});
    //買うor買わないor?がお買い物候補に従属していることを定義
    Buy.sync();
    //買うor買わないに対するテーブル作成
  });
});

var GitHubStrategy = require('passport-github2').Strategy;//passportがGithubのOAuth認証を利用するためのStrategyモジュール

//OAuth用トークン※要秘匿　
//ToDo環境変数にあとでいれること※
var GITHUB_CLIENT_ID = '036409f96cf485310de3';
var GITHUB_CLIENT_SECRET = '0a411ddc830858c2f545d72c004b144c58a565f9';

//認証されたユーザー情報のセッションへの保存と読み出し
passport.serializeUser(function(user,done){
  done(null, user);
});//保存 done関数は第一引数はエラー、第二は結果

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});//読み出し

// GitHub を利用した認証のStrategy オブジェクトの設定とイベントループ処理
passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:8000/auth/github/callback'
},
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
      User.upsert({//upsert関数でデータの挿入or更新
        userId: profile.id,//取得されたユーザーIDをデータベースに保存
        username: profile.username//ユーザー名をUserのテーブルに保存
      }).then(() =>{
        done(null,profile);
      });
    });
  }
  ));//process.nextTick関数はイベントループ。認証後にprofileを返す

//ルーターモジュール
var indexRouter = require('./routes/index');//index.jsの読み込み
var loginRouter = require('./routes/login');//login.jsの読み込み
var logoutRouter= require('./routes/logout');//logout.jsの読み込み
var shopping_listsRouter= require('./routes/shopping_lists');//shopping_lists.jsの読み込み
var buysRouter =require('./routes/buys');
var commentsRouter =require('./routes/comments');


var app = express();
app.use(helmet());//セキュリティ対策

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//GitHubのOAuth認証　セッション利用の設定
//TODO　あとで秘密キーを環境変数.envにいれること
app.use(session({ 
  secret: 'c1c3cffd938e97b7',//※セッションIDを作成するときの秘密キー
  resave: false, //セッションを必ずストアに保存しない
  saveUninitialized: false //セッションが初期化されていなくてもストアに保存しない
}));//express-session と passport でセッションを利用する設定
app.use(passport.initialize());//passportのセッション初期化
app.use(passport.session());//passportのセッションを使う設定

//''内のパスにアクセスされたら隣にあるルーターオブジェクトを返す設定
app.use('/', indexRouter);// router/index.js
app.use('/login', loginRouter);// router/login.js
app.use('/logout',logoutRouter);// router/logout.js
app.use('/shopping_lists',shopping_listsRouter)//router/shopping_lists.js
app.use('/shopping_lists',buysRouter);
app.use('/shopping_lists',commentsRouter);

//パスに対するHTTPリクエストハンドラの登録
//GitHubへの認証を行う処理をGETで/auth/githubへアクセスした際に行う処理
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),//Githubのスコープ(認可される権限の範囲）は[user:email]
  function (req, res) {
});//function 以下の空白にはリクエストが行われた際に何もしない関数になっているので処理が必要な場合は書くこと

//OAuth2.0の仕組み。GitHub が利用者の許可に対する問い合わせの結果を送るパス/auth/github/callback のハンドラを登録
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),//認証が失敗したら'/login'にリダイレクト
  function (req, res) {
    res.redirect('/');//認証に成功したら/にリダイレクト
});

//GitHub の OAuth2.0 で認可される権限の範囲
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  function (req, res) {
});
// /auth/github/callback のハンドラの登録とlogin失敗時のリダイレクト
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),//失敗したらloginへ
  function (req, res) {
    res.redirect('/');// '/'へリダイレクト
});

//不要？
// //ログインページ
// app.get('/login', function (req, res) {
//     res.render('login');
//   });

// //ログアウトページ
// app.get('/logout', function (req, res) {
//     req.logout();
//     res.redirect('/');
//   });

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
//TODOあとで404はこちらに変更（もろバレするので…。上は保守用に残すこと）
// app.use(function(req,res,next){
//   res.status(404);
//   res.locals.error = {};
//   res.render('error',{message:"404: The page was not found"})
// })
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
