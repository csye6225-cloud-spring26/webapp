import userRoute from "./userRoute.js";
import healthRoute from "./healthRoute.js";
import healthRouteNew from "./newHealthRoute.js";
import metadataRoute from "./metadataRoute.js";
import courseRoute from "./courseRoute.js";
import verificationRoute from "./verificationRoute.js";
import routes from "../utils/routes.json" with { type: "json" };

const initializeRoutes = (app) => {
    app.use(routes.user, userRoute);
    app.use(routes.health, healthRoute);
    app.use(routes.healthNew, healthRouteNew);
    app.use(routes.metadata, metadataRoute);
    app.use(routes.courses, courseRoute);
    app.use(routes.validateEmail, verificationRoute);
}

export default initializeRoutes;