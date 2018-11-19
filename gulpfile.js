// basic script includes
const minimist = require("minimist");

// gulp related includes
const gulp = require("gulp");
const ts = require("gulp-typescript");
const del = require("del");
const mocha = require("gulp-mocha");

let args = minimist(process.argv.slice(2), {
    boolean : ["debug"]
});

// Folders
let BUILD_FOLDER = "bin";
let LCOV_FILE = `${BUILD_FOLDER}/coverage.lcov`;
let XUNIT_FILE = `${BUILD_FOLDER}/coverage.xml`;
let COVERAGE_FOLDER = `${BUILD_FOLDER}/coverage`;
let RELEASE_FOLDER = "lib";
let CLEAN_UP = [BUILD_FOLDER, RELEASE_FOLDER, COVERAGE_FOLDER, LCOV_FILE];

gulp.task("clean", () =>
    // return the promise result to signal async
    del(CLEAN_UP)
);

gulp.task("build", ["clean"], () => {
    let source = [ 'src/**/*.ts' ]
    if (args.debug) {
        source.push("src/debug/**/*.ts");
    }
    let tsProject = ts.createProject('tsconfig.json');
    return gulp.src(source)
        .pipe(tsProject())
        .pipe(gulp.dest(BUILD_FOLDER));
});

gulp.task("test", ["build"], () =>
    gulp.src(PATHS.tests, { read : false }).pipe(mocha({ reporter: "spec" }))
);

gulp.task("default", ["build"]);
