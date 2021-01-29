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

//お買い物リストが作成でき、表示されることをテスト
describe('shopping_lists', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('予定が作成でき、表示される', done => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      //エラーを吐くので後で要検証。ただ…リストは作れているので問題ない様子。謎。
      request(app)
        .post('shopping_lists')
        .send({
        shopping_listName: 'テスト予定1',
          memo: 'テストメモ1\r\nテストメモ2',
          candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3'
        })
        .expect('Location', /shopping_lists/)
        .expect(302)
        .end((err, res) => {
          const createShopping_list_Path = res.headers.location;
          request(app)
            .get(create_shopping_list_Path)
            //作成された予定と候補が表示されていることをテストする
            .expect(/ステーキ/)
            .expect(/牛肉/)
            .expect(/おでん/)
            .expect(/ダイコン/)
            .expect(/焼き魚/)
            .expect(/鯖/)
            .expect(200)

            .end((err, res) => {
              if (err) return done(err);
              // テストで作成したデータを削除
              const_shopping_list_Id = create_shopping_list_Path.split('shopping_lists/')[1];
              Candidate.findAll({
                where: {shopping_list_Id:shopping_list_Id }
              }).then(candidates => {
                const promises = candidates.map(c => {
                  return c.destroy();
                });
                Promise.all(promises).then(() => {
                shopping_list.findByPk(shopping_list_Id).then(s => {
                    s.destroy().then(() => {
                      if (err) return done(err);
                      done();
                    });
                  });
                });
              });
            });
        });
    });
  });
});
});