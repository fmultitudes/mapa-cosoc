var gulp = require('gulp');
var plugins = require("gulp-load-plugins")({lazy:false});
var minifyCss = require('gulp-minify-css');

gulp.task('scripts', function(){
    //combine all js files of the app
    gulp.src([
        './app/geo/regiones.json',
        './app/js/main.js'
        ])
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('default'))
        .pipe(plugins.concat('app.js'))
        .pipe(gulp.dest('./build/js'));
});

gulp.task('css', function(){
    gulp.src(['./app/css/app.css'])
        .pipe(plugins.concat('app.css'))
        .pipe(minifyCss({compatibility: 'ie8'}))
        .pipe(gulp.dest('./build/css'));
});

gulp.task('vendorJS', function(){
    //concatenate vendor JS files
    gulp.src([
        './bower_components/jquery/dist/jquery.min.js',
        './bower_components/d3/d3.min.js',
        './bower_components/tabletop/src/tabletop.js',
        './bower_components/topojson/topojson.js',
        './bower_components/knockout/dist/knockout.js',
        './bower_components/lodash/lodash.min.js',
        './bower_components/d3-tip/index.js'
        ])
        .pipe(plugins.concat('lib.js'))
        .pipe(gulp.dest('./build/js'));
});


gulp.task('copy-index', function() {
    gulp.src([
        './app/index.html'
        ])    
        .pipe(gulp.dest('./build'));
});

gulp.task('copy-geo', function() {
    gulp.src([
        './app/geo/**/*'
        ])    
        .pipe(gulp.dest('./build/geo'));
});

gulp.task('watch',function(){
    gulp.watch([
        'build/**/*.html',        
        'build/**/*.js',
        'build/**/*.css'        
    ], function(event) {
        return gulp.src(event.path)
            .pipe(plugins.connect.reload());
    });
    gulp.watch(['./app/**/*.js'],['scripts']);
    gulp.watch('./app/css/*.css',['css']);
    gulp.watch(['./app/index.html'],['copy-index']);

});

gulp.task('connect', plugins.connect.server({
    root: ['build'],
    port: 10000,
    livereload: true
}));

gulp.task('default',['connect','scripts','css','copy-index','vendorJS','watch']);

