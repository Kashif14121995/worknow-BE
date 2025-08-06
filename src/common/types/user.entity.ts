// ./../user/user.entity
export interface User {
  name: string;
  email: string;
}
export interface SendOTP extends User {
  otp: number;
}

export interface ForgotPasswordMailSchema extends User {
  url: string;
}
