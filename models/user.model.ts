import { Schema, model, Document, Types } from "mongoose";


export interface IUser extends Document {
  fullName: string;
  description?: string;
  email: string;
  password: string;
  token?: string;
  avatar?: string;
  deleted: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    description: { type: String, default: "Losing myself in the beats of the night. 🌙" },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String, default: "" },
   
    avatar: { type: String, default: "" },
    deleted: { type: Boolean, default: false },
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema, "users");

