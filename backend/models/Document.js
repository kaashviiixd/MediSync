import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  file_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  document_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default Document;
