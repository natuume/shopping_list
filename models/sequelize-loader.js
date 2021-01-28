'use strict';
//sequelizeの読み込み定義

const Sequelize = require('sequelize');
const sequelize =new Sequelize(
  'postgres://postgres:postgres@localhost/shopping_list'
);

module.exports = {
  database: sequelize,
  Sequelize: Sequelize
};