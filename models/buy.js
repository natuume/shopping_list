'use strict';
const loader =require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Buy = loader.database.define(
  'buys',
  {
    candidateId:{
      type: Sequelize.INTEGER,//整数型
      primaryKey: true,//主キー
      allowNull: false
    },
    userId:{
      type:Sequelize.INTEGER,
      primaryKey: true,//主キー　2個目
      allowNull: false
    },
    buyId:{
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    shopping_list_Id:{
      type: Sequelize.UUID,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false,
    indexes:[
      {
        fields:['shopping_list_Id']
      }
    ]
  }
);

module.exports = Buy;