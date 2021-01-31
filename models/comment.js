'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Comment = loader.database.define('comments',{
    shopping_list_Id:{
      type: Sequelize.UUID,
      primaryKey:true, // 主キー
      allowNull: false
    },
    userId: {
      type: Sequelize.INTEGER,
      primaryKey: true, //主キー
      allowNull:false
    },
    comment: {
      type: Sequelize.STRING,
      allowNull: false
    }
  },
  {
    freezeTabName:true,
    timestamps: false
  });

module.exports =Comment;