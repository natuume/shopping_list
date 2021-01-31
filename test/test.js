'use strict';
const request = require('supertest');
const assert = require('assert');
const app = require('../app');
const passportStub = require('passport-stub');
const User = require('../models/user');
const Shopping_list = require('../models/shopping_list');
const Candidate = require('../models/candidate');
const Buy = require('../models/buy');
const Comment = require('../models/comment');
const deleteShopping_listAggregate = require('../routes/shopping_lists').deleteShopping_listAggregate;

describe('/login', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('ログインのためのリンクが含まれる', () => {
    return request(app)
      .get('/login')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a class="btn btn-info my-3" href="\/auth\/github"/)
      .expect(200);
  });

  test('ログイン時はユーザー名が表示される', () => {
    return request(app)
      .get('/login')
      .expect(/testuser/)
      .expect(200);
  });
});

describe('/logout', () => {
  test('/ にリダイレクトされる', () => {
    return request(app)
      .get('/logout')
      .expect('Location', '/')
      .expect(302);
  });
});

describe('/shopping_lists', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('予定が作成でき、表示される', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .post('/shopping_lists')
        .send({ shopping_list_Name: 'テスト予定1', memo: 'テストメモ1\r\nテストメモ2', candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3' })
        .expect('Location', /shopping_lists/)
        .expect(302)
        .end((err, res) => {
          const createdShopping_listPath = res.headers.location;
          request(app)
            .expect(/テスト予定1/)
            .expect(/テストメモ1/)
            .expect(/テストメモ2/)
            .expect(/テスト候補1/)
            .expect(/テスト候補2/)
            .expect(/テスト候補3/)
            .expect(200)
            .end((err, res) => { deletehopping_listeAggregate(createdShopping_listPath.split('/shopping_lists/')[1], done, err); });
        });
    });
  });
});

describe('/shopping_lists/:shopping_list_Id/users/:userId/candidates/:candidateId', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('出欠が更新できる', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .post('/shopping_lists')
        .send({ shopping_list_Name: 'テスト出欠更新予定1', memo: 'テスト出欠更新メモ1', candidates: 'テスト出欠更新候補1' })
        .end((err, res) => {
          const createdShopping_listPath = res.headers.location;
          Candidate.findOne({
            where: { shopping_list_Id: shopping_list_Id }
          }).then((candidate) => {
            // 更新がされることをテスト
            const userId = 0;
            request(app)
              .post(`/shopping_lists/${shopping_list_Id}/users/${userId}/candidates/${candidate.candidateId}`)
              .send({ buy: 2 }) // 出席に更新
              .expect('{"status":"OK","buy":2}')
              .end((err, res) => {
                Buy.findAll({
                  where: { shopping_list_Id: shopping_list_Id }
                }).then((buys) => {
                  assert.strictEqual(buys.length, 1);
                  assert.strictEqual(buys[0].buy, 2);
                  deleteShopping_listAggregate(shopping_list_Id, done, err);
                });
              });
          });
        });
    });
  });
});

describe('/shopping_lists/:shopping_list_Id/users/:userId/comments', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('コメントが更新できる', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .post('/shopping_lists')
        .send({ shopping_list_Name: 'テストコメント更新予定1', memo: 'テストコメント更新メモ1', candidates: 'テストコメント更新候補1' })
        .end((err, res) => {
          const createdShopping_listPath = res.headers.location;
          const shopping_list_Id = createdShopping_listPath.split('/shopping_lists/')[1];
          // 更新がされることをテスト
          const userId = 0;
          request(app)
            .post(`/shopping_lists/${shopping_list_Id}/users/${userId}/comments`)
            .send({ comment: 'testcomment' })
            .expect('{"status":"OK","comment":"testcomment"}')
            .end((err, res) => {
              Comment.findAll({
                where: { shopping_list_Id: shopping_list_Id }
              }).then((comments) => {
                assert.strictEqual(comments.length, 1);
                assert.strictEqual(comments[0].comment, 'testcomment');
                deleteShopping_listAggregate(shopping_list_Id, done, err);
              });
            });
        });
    });
  });
});


describe('/shopping_lists/:shopping_list_Id?edit=1', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('予定が更新でき、候補が追加できる', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .post('/shopping_lists')
        .send({ shopping_list_Name: 'テスト更新予定1', memo: 'テスト更新メモ1', candidates: 'テスト更新候補1' })
        .end((err, res) => {
          const createdShopping_listPath = res.headers.location;
          const shopping_list_Id = createdShopping_listPath.split('/shopping_lists/')[1];
          // 更新がされることをテスト
          request(app)
            .post(`/shopping_lists/${shopping_list_Id}?edit=1`)
            .send({ shopping_list_Name: 'テスト更新予定2', memo: 'テスト更新メモ2', candidates: 'テスト更新候補2' })
            .end((err, res) => {
              Shopping_list.findByPk(shopping_list_Id).then((s) => {
                assert.strictEqual(s.shopping_list_Name, 'テスト更新予定2');
                assert.strictEqual(s.memo, 'テスト更新メモ2');
              });
              Candidate.findAll({
                where: { shopping_list_Id: shopping_list_Id },
                order: [['candidateId', 'ASC']]
              }).then((candidates) => {
                assert.strictEqual(candidates.length, 2);
                assert.strictEqual(candidates[0].candidateName, 'テスト更新候補1');
                assert.strictEqual(candidates[1].candidateName, 'テスト更新候補2');
                deleteShopping_listAggregate(shopping_list_Id, done, err);
              });
            });
        });
    });
  });
});

describe('/shopping_lists/:shopping_list_Id?delete=1', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('予定に関連する全ての情報が削除できる', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .post('/shopping_lists')
        .send({ shopping_list_Name: 'テスト更新予定1', memo: 'テスト更新メモ1', candidates: 'テスト更新候補1' })
        .end((err, res) => {
          const createdShopping_listPath = res.headers.location;
          // 〇✕作成
          const promiseBuy = Candidate.findOne({
            where: { shopping_list_Id: shopping_list_Id }
          }).then((candidate) => {
            return new Promise((resolve) => {
              const userId = 0;
              request(app)
                .post(`/shopping_lists/${shopping_list_Id}/users/${userId}/candidates/${candidate.candidateId}`)
                .send({ buy: 2 }) // 出席に更新
                .end((err, res) => {
                  if (err) done(err);
                  resolve();
                });
            });
          });

          // コメント作成
          const promiseComment = new Promise((resolve) => {
            const userId = 0;
            request(app)
              .post(`/shopping_lists/${shopping_list_Id}/users/${userId}/comments`)
              .send({ comment: 'testcomment' })
              .expect('{"status":"OK","comment":"testcomment"}')
              .end((err, res) => {
                if (err) done(err);
                resolve();
              });
          });

          // 削除
          const promiseDeleted = Promise.all([promiseBuy, promiseComment]).then(() => {
            return new Promise((resolve) => {
              request(app)
                .post(`/shopping_lists/${shopping_list_Id}?delete=1`)
                .end((err, res) => {
                  if (err) done(err);
                  resolve();
                });
            });
          });

          // テスト
          promiseDeleted.then(() => {
            const p1 = Comment.findAll({
              where: { shopping_list_Id: shopping_list_Id }
            }).then((comments) => {
              assert.strictEqual(comments.length, 0);
            });
            const p2 = Buy.findAll({
              where: { shopping_list_Id: shopping_list_Id }
            }).then((buys) => {
              assert.strictEqual(buys.length, 0);
            });
            const p3 = Candidate.findAll({
              where: { shopping_list_Id: shopping_list_Id }
            }).then((candidates) => {
              assert.strictEqual(candidates.length, 0);
            });
            const p4 = Shopping_list.findByPk(shopping_list_Id).then((shopping_list) => {
              assert.strictEqual(!shopping_list, true);
            });
            Promise.all([p1, p2, p3, p4]).then(() => {
              if (err) return done(err);
              done();
            });
          });
        });
    });
  });
});