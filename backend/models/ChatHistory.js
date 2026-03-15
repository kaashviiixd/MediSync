import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChatHistory = sequelize.define('ChatHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sender: {
    type: DataTypes.ENUM('user', 'ai'),
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  extracted_insights: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

export default ChatHistory;
