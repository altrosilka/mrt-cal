var fs = require('fs');
var gulp = require('gulp');

var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var autoprefixer = require('gulp-autoprefixer');
var replace = require('gulp-replace');
var gulpsync = require('gulp-sync')(gulp);
var uglify = require('gulp-uglify');
var less = require('gulp-less');

const DIST_FOLDER_NAME = 'dist';

const SRC_PATHS = {
  templates: ['src/static/**.html'],
  oferta: ['src/static/oferta.html'],
  styles: ['src//style.less'],
  index: ['src/index.html'],
  scripts: ['src/rfc-calc.js']
}

const DIST_PATHS = {
  scripts: DIST_FOLDER_NAME + '/**/*.js',
  styles: DIST_FOLDER_NAME + '/**/*.css',
}


gulp.task('build', gulpsync.sync(['www', 'uglify']));
gulp.task('default', ['www']);
gulp.task('www', gulpsync.sync(['index', 'styles', 'scripts']));


gulp.task('scripts', function() {
  return gulp.src(SRC_PATHS.scripts)
    .pipe(replaceVars())
    .pipe(gulp.dest(DIST_FOLDER_NAME));
});

gulp.task('index', function() {
  return gulp.src(SRC_PATHS.index)
    .pipe(gulp.dest(DIST_FOLDER_NAME));
});

gulp.task('styles', function() {
  return gulp.src(SRC_PATHS.styles)
    .pipe(less())
    .pipe(autoprefixer())
    .pipe(rename('style.css'))
    .pipe(gulp.dest(DIST_FOLDER_NAME));
});

gulp.task('uglify', gulpsync.sync(['uglify:css', 'scripts', 'uglify:js']));

gulp.task('uglify:css', function() {
  return gulp.src(DIST_PATHS.styles)
    .pipe(minifyCss())
    .pipe(gulp.dest(DIST_FOLDER_NAME));
});

gulp.task('uglify:js', function() {
  return gulp.src(DIST_PATHS.scripts)
    .pipe(uglify())
    .pipe(gulp.dest(DIST_FOLDER_NAME));
});

gulp.task('watch', ['www'], function() {
  gulp.watch(SRC_PATHS.scripts, ['www']);
  gulp.watch(SRC_PATHS.styles, ['www']);
  gulp.watch(SRC_PATHS.index, ['www']);
  gulp.watch(SRC_PATHS.templates, ['www']);
});

function packPatternsForReplace() {
  var INJECTED_PATHS = {
    style: fs.readFileSync(__dirname + '/dist/style.css', 'utf8').replace(/(\n|\r)+/g, '').replace(/"/g, "\\\"").replace(/'/g, "\\\'"),
    lib_datepicker_css: fs.readFileSync(__dirname + '/src/lib/datePicker/datePicker.css', 'utf8').replace(/(\n|\r)+/g, '').replace(/"/g, "\\\"").replace(/'/g, "\\\'"),
    lib_datepicker_js: fs.readFileSync(__dirname + '/src/lib/datePicker/datePicker.js', 'utf8'),
    lib_masked: fs.readFileSync(__dirname + '/src/lib/mask/mask.js', 'utf8'),
    oferta: fs.readFileSync(__dirname + '/src/static/oferta.html', 'utf8').replace(/(\n|\r)+/g, '').replace(/"/g, "\\\"").replace(/'/g, "\\\'"),
    template: fs.readFileSync(__dirname + '/src/static/template.html', 'utf8').replace(/(\n|\r)+/g, '').replace(/"/g, "\\\"").replace(/'/g, "\\\'")
  }

  var val, patterns = {};
  for (var key in INJECTED_PATHS) {
    val = INJECTED_PATHS[key];
    patterns[key] = val;
  }

  return patterns;
}

function replaceVars() {
  var pack = packPatternsForReplace();
  return replace(/\$INJECT_([a-zA-Z0-9_]*)/g, function(match, p1, offset, string) {
    return pack[p1];
  }, {
    skipBinary: true
  })
}