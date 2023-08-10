const gulp = require('gulp');
const inlinesource = require('gulp-inline-source');
const replace = require('gulp-replace');

gulp.task('default', () => {
  return gulp
    .src('./src/*.html')
    .pipe(replace('script.js"></script>', 'script.js" inline></script>'))
    .pipe(replace('href="styles.css" rel="stylesheet">', 'href="styles.css" rel="stylesheet" inline>'))
    .pipe(
      inlinesource({
        compress: false,
        ignore: ['png'],
      })
    )
    .pipe(gulp.dest('./build'));
});
