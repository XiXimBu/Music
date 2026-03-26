// Dung de tao ung dung Express va lay kieu Express cho bien app.
import "./types/express-session";
import express, { Express } from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import { flashToastMiddleware } from "./middlewares/admin/toast.middleware";
import { attachAuthStatus } from "./middlewares/client/auth.middleware";
// Dung de gan toan bo router phien ban v1 vao app chinh.
import clientRoutes from "./routes/client/index.routes";

// Dung module database de mo ket noi MongoDB truoc khi app nhan request.
import * as database from "./config/database";
import { systemConfig } from "./config/system";
import adminRoutes from "./routes/admin/index.routes";
import mongoose from "mongoose";
import slug from "mongoose-slug-updater";




// app duoc gan kieu Express de TypeScript biet day la doi tuong server cua Express.
const app: Express = express();
app.use(express.static(`${__dirname}/public`));
app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');
// number | string la union type: port co the la so 3000 hoac chuoi lay tu bien moi truong.
const port: number | string = process.env.PORT || 3000;

// Note: Su dung express.json() theo yeu cau de parse JSON body.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Note: cookie-parser giup doc duoc req.cookies trong auth middleware/controller.
app.use(cookieParser());
app.use(attachAuthStatus);

// Session (flash toast): cookie session, không lưu session rỗng cho đến khi có dữ liệu.
app.use(
	session({
		secret: process.env.SESSION_SECRET || "music-dev-toast-secret",
		resave: false,
		saveUninitialized: false,
		name: "music.sid",
		cookie: {
			httpOnly: true,
			maxAge: 1000 * 60 * 60 * 24 * 7,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		},
	})
);
// Sau mỗi request: đưa toast từ session → res.locals, rồi xóa session.
app.use(flashToastMiddleware);

mongoose.plugin(slug);

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(
    cors({
        origin: corsOrigin,
        credentials: true,
    })
);

// 🚀 Global DB connect middleware (serverless-safe)
// - Skip static assets to avoid needless DB wake-ups.
// - Ensure all dynamic routes run after DB is connected (avoid Mongoose buffering timeout).
app.use(async (req, res, next) => {
	try {
		const path = req.path || "";
		const isStatic =
			path.startsWith("/dist/") ||
			path.startsWith("/images/") ||
			path.startsWith("/client/") ||
			path === "/favicon.ico" ||
			/\.[a-zA-Z0-9]+$/.test(path); // file extension

		if (isStatic) {
			next();
			return;
		}

		await database.connect();
		next();
	} catch (error) {
		console.error("Global DB connect error:", error);
		res.status(500).send("Database connection failed");
	}
});

// Truyen app vao ham route tong de mount cac endpoint /api/v1/...
clientRoutes(app);
adminRoutes(app);


app.locals.PrefixAdmin = systemConfig.prefixAdmin;// biến toàn cục cho view engine, có thể truy cập trong Pug bằng PrefixAdmin


// Note: Error handling co ban, tra ve JSON thong nhat khi co loi.
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
    if (res.headersSent) {
        next(error);
        return;
    }
    res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
    });
});

// Render/Local: luôn listen theo PORT do platform cấp (fallback 3000).
app.listen(port, () => {
	console.log(`Server đang chạy ở port ${port}`);
});
export default app;
