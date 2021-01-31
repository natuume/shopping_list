'use strict';
//sequelizeの読み込み定義

const Sequelize = require('sequelize');
const sequelize =new Sequelize(
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost/shopping_list'
);

module.exports = {
  database: sequelize,
  Sequelize: Sequelize
};