import { Express } from "express";
import { systemConfig } from "../../config/system";
import dashboardRoutes from "./dashboard.routes";
import manageSongRoutes from "./manage.song.routes";
import manageArtistRoutes from "./manage.artist.routes";

const adminRoutes = (app: Express): void => {

  const PATH_ADMIN = `/${systemConfig.prefixAdmin}`;

  app.use(`${PATH_ADMIN}/dashboard`, dashboardRoutes);
  app.use(`${PATH_ADMIN}/song`, manageSongRoutes);
  app.use(`${PATH_ADMIN}/artist`, manageArtistRoutes);
};

export default adminRoutes;
