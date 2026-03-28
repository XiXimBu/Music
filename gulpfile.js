const gulp = require('gulp');
const { createGulpEsbuild } = require('gulp-esbuild');
const esbuild = createGulpEsbuild();

const CLIENT_JS = 'public/client/javascript/app-entry.js';

// 1. Nhiệm vụ gom toàn bộ JS thành 1 file
gulp.task('js', () => {
    return gulp.src(CLIENT_JS) // Entry bundle (import từ cùng thư mục client/javascript)
        .pipe(esbuild({
            outfile: 'main.bundle.js', // Tên file sau khi gom
            bundle: true,              // Bật chế độ gom file
            minify: true,              // Nén nhỏ file lại để tải cho nhanh
            sourcemap: true,           // Xem code gốc khi F12 để debug
            target: 'es6',
        }))
        .pipe(gulp.dest('public/dist/js')); // Nơi chứa file đã gom
});

// Sửa file JS thì nó tự chạy lại
gulp.task('watch', () => {
    gulp.watch('public/client/javascript/**/*.js', gulp.series('js'));
});

// Chạy mặc định
gulp.task('default', gulp.series('js', 'watch'));