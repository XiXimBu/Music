import { Express } from "express";
import homeRoutes from "./home.routes";
import artistRoutes from "./artist.routes";
import  topicRoutes from "./topic.routes";
import searchRoutes from "./search.routes";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import playlistRoutes from "./playlist.routes";
import followArtistRoutes from "./follow.artist.routes";
import listenHistoryRoutes from "./listen.history.routes";
import exploreRoutes from "./explore.routes";



const clientRoutes = (app: Express): void => {
  app.use(`/auth`, authRoutes);
  app.use(`/artist`, artistRoutes);
  app.use(`/topics`, topicRoutes);
  app.use(`/home`, homeRoutes);
  app.use(`/explore`, exploreRoutes);
  app.use(`/`, homeRoutes);
  app.use(`/search`, searchRoutes);
  app.use(`/user`, userRoutes);
  app.use(`/playlist`, playlistRoutes);
  app.use(`/history`, listenHistoryRoutes);
  app.use(`/`, followArtistRoutes);
};

export default clientRoutes;
