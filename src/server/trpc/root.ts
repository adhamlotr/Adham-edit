import { createTRPCRouter } from "./trpc";
import { serviceRequestsRouter } from "./routers/serviceRequests";

export const appRouter = createTRPCRouter({
   
  // Candidates add routers here, e.g.:
  serviceRequests: serviceRequestsRouter,
});

export type AppRouter = typeof appRouter;
