/**
 * Entry duy nhất cho esbuild — gom toàn bộ logic client vào main.bundle.js
 * (thứ tự: Turbo page lifecycle → player + track-data → các module còn lại)
 */
import "./handle.turbo.js";
import "./handle.player.js";
import "./handle.history.js";
import "./handle.home.js";
import "./handle.search.js";
import "./handle.follow.js";
import "./handle.playlist.js";
import "./handle.edit.profile.js";
import "./handle.previous.js";
import "./handle.footer.js";
