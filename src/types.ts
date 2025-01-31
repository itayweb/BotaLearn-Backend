import { Request } from "express";

export interface User {
    email: string | undefined;
    fullName: string | undefined;
    username: string | undefined;
    password?: string | undefined;
}

export interface RegisterRespnse {
    message: string;
}

export interface LoginResponse {
    token?: string;
    message?: string;
}

export interface ProtectedRequest {
    email: string;
    exp: number;
    iat: number;
}

export interface AuthenticatedRequest extends Request {
  user?: ProtectedRequest; // Replace ProtectedRequest with the actual user type
}
