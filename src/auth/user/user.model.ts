import * as mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});

export const UserModel = mongoose.model('User', UserSchema);
