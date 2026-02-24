// Import route handlers for different application resources.
import userRoute from "./userRoute.js";
import healthRoute from "./healthRoute.js";
import metadataRoute from "./metadataRoute.js";
import courseRoute from "./courseRoute.js";
import routes from "../utils/routes.json" with { type: "json" };

const initializeRoutes = (app) => {
    app.use(routes.user, userRoute);
    app.use(routes.health, healthRoute);
    app.use(routes.metadata, metadataRoute);
    app.use(routes.courses, courseRoute);
}

export default initializeRoutes;