import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DoctorProfile = sequelize.define('DoctorProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  degree: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  hospital: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  experience: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  fees: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  available_days: {
    type: DataTypes.STRING, // Store as comma-separated or JSON
    allowNull: true,
  },
  available_slots: {
    type: DataTypes.TEXT, // Store JSON string
    allowNull: true,
  },
  profile_image: {
     type: DataTypes.STRING,
     allowNull: true
  }
});

export default DoctorProfile;
