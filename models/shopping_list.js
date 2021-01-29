'use strict';
const loader =require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Shopping_list = loader.database.define(
  'shopping_lists',
  {
    shopping_list_Id:{
      type: Sequelize.UUID,//UUID使用
      primaryKey: true,//主キー
      allowNull:false
    },
    shopping_list_Name :{
      type:Sequelize.STRING,
      allowNull: false
    },
    // username: {
    //   type: Sequelize.STRING,
    //   allowNull: false
    // },→ダメでした後で問題になるのだったらデータベース作り直してみる
    memo: {
      type:Sequelize.TEXT,
      allowNull:false
    },
    createdBy:{
      type: Sequelize.INTEGER,//整数型
      allowNull:false
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull:false
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
    indexes:[
      {
        fields:['createdBy']
      }
    ]
  }
);

module.exports = Shopping_list;