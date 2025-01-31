import { Request } from "express";

export interface User {
    email: string;
    password: string;
}

export interface RegisterRespnse {
    message: string;
}

export interface LoginResponse {
    token?: string;
    message?: string;
}

export interface ProtectedRequest {
    user: User
}
export interface AuthenticatedRequest extends Request {
  user?: ProtectedRequest; // Replace ProtectedRequest with the actual user type
}
