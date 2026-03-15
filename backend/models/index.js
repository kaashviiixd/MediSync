import sequelize from '../config/database.js';
import User from './User.js';
import DoctorProfile from './DoctorProfile.js';
import Appointment from './Appointment.js';
import ChatHistory from './ChatHistory.js';
import Document from './Document.js';

// User <-> DoctorProfile (1:1)
User.hasOne(DoctorProfile, { foreignKey: 'userId', as: 'doctorProfile' });
DoctorProfile.belongsTo(User, { foreignKey: 'userId' });

// User (Patient) <-> Appointment (1:N)
User.hasMany(Appointment, { foreignKey: 'patientId', as: 'patientAppointments' });
Appointment.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });

// User (Doctor) <-> Appointment (1:N)
User.hasMany(Appointment, { foreignKey: 'doctorId', as: 'doctorAppointments' });
Appointment.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

// User <-> ChatHistory (1:N)
User.hasMany(ChatHistory, { foreignKey: 'patientId', as: 'chatHistories' });
ChatHistory.belongsTo(User, { foreignKey: 'patientId' });

// User <-> Document (1:N)
User.hasMany(Document, { foreignKey: 'patientId', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'patientId' });

export {
  sequelize,
  User,
  DoctorProfile,
  Appointment,
  ChatHistory,
  Document
};
