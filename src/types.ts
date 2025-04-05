import { UUID } from "crypto";
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
    id: UUID;
    username: string;
    fullname: string;
    email: string;
    password: string;
    exp: number;
    iat: number;
}

export interface AuthenticatedRequest extends Request {
  user?: ProtectedRequest; // Replace ProtectedRequest with the actual user type
}
