'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Candidate = loader.database.define(
  'candidates',
  {
    candidateId:{
      type: Sequelize.INTEGER,//整数型
      primaryKey: true,　//主キー
      autoIncrement: true,//行番号をリサイクルしない
      allowNull: false
    },
    candidateName:{
      type: Sequelize.STRING,//文字列
      allowNull: false
    },
    shopping_list_Id:{
      type: Sequelize.UUID,
      allowNull:false
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        fields: ['shopping_list_Id']
      }
    ]
  }
);

module.exports = Candidate;