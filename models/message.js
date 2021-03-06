'use strict';
module.exports = (sequelize, DataTypes) => {
  const message = sequelize.define('message', {
    subject: DataTypes.STRING,
    body: DataTypes.STRING,
    userId: DataTypes.INTEGER
  }, {});
  message.associate = function (models) {
    // associations can be defined here
    message.belongsTo(models.user);

  };
  return message;
};