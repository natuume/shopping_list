'use strict';
//テストのために読み込むファイル
const request = require('supertest');//supertest(Routerの挙動テストのモジュール）の読み込み
const app = require('../app');//テストのためにapp.jsの読み込み
const passportStub = require('passport-stub');//passportStub(GitHub認証のログインログアウト処理をテスト内で模倣するモジュール)

//passport-stub モジュールの具体的な読み込み部分
describe('/login', () => {
    beforeAll(() =>{
      passportStub.install(app);//ログイン前にpassportStubインストール
      passportStub.login({ username:'testuser'});//ログインしてtestuserでログイン
    });

    afterAll(() =>{
      passportStub.logout();//beforeAllの処理もログインも終わったらログアウト
      passportStub.uninstall(app);//passport
    });

//ログインのためのリンクが含まれるかテスト(リクエストのテスト）
  test('ログインのためのリンクが含まれる', () => {
    return request(app)
      .get('/login')//ログインへのGETリクエスト
      .expect('Content-Type', 'text/html; charset=utf-8')//ヘッダに右の値があるかテスト
      .expect(/<a href="\/auth\/github"/)//<a href="/auth/github"がHTMLに含まれるかテスト
      .expect(200);//テスト終了時に期待されるステータスコード200
  });

//ログイン時に/loginにユーザー名が表示されるかテスト
  test('ログイン時はユーザー名が表示される', () =>{
    return request(app)
    .get('/login')
    .expect(/testuser/)//testuserがログイン時に表示されているかテスト
    .expect(200);
  });

//　/logoutにアクセスした際に/にリダイレクトされる
　　test("/logout'にアクセスした際に/にリダイレクトされる",() =>{
  return request(app)
  .get('/logout')
  .expect('Location','/')// Location＝関連付けられたURL　/にリダイレクト
  .expect(302);//302はリダイレクト
});

});