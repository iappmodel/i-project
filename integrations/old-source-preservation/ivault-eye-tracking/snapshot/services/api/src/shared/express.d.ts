import type { AdminAuthContext, AuthContext } from "../middleware/auth";

declare global {
  namespace Express {
    interface AdminRiskContext {
      adminDeviceId: string;
      adminNetworkObservationId: string;
      adminSessionContextId: string;
    }

    interface Request {
      requestId?: string;
      auth?: AuthContext;
      admin?: AdminAuthContext;
      adminRisk?: AdminRiskContext | null;
      adminSessionId?: string | null;
      validatedBody?: any;
      validatedQuery?: any;
      validatedParams?: any;
    }
  }
}

export {};
