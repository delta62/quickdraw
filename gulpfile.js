/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// basic script includes
import minimist from "minimist";
import fs from "fs";

// get npm and the internal logger it is using
import npm from "npm";
import npmlog from "npm/node_modules/npmlog";

// gulp related includes
import gulp from "gulp";
import bump from "gulp-bump";
import coffee from "gulp-coffee";
import coffeeCov from "gulp-coffee-coverage";
import concat from "gulp-concat";
import del from "del";
import header from "gulp-header";
import mocha from "gulp-mocha";
import prompt from "gulp-prompt";
import rename from "gulp-rename";
import shell from "gulp-shell";
import uglify from "gulp-uglify";

let args = minimist(process.argv.slice(2), {
    string  : ["dir", "type", "channel"],
    boolean : ["debug"],
    default : {
        channel : "latest",
        type : "patch",
        debug : false
    }
});

// Check that any arguments given are valid
// Type argument
if (!__in__(args.type, ["major", "minor", "patch", "prerelease"])) {
    console.error("Invalid type given, must be either 'major', 'minor', 'patch', or 'prerelease'");
    process.exit(1);
}

if (args.type === "prerelease") {
    args.channel = "rc";
}

// check the directory given exists
if (args.dir != null) {
    let stats = fs.statSync(args.dir);
    if (!stats.isDirectory()) {
        console.error("Given path is not a directory");
        process.exit(1);
    }
}

const PATHS = {
    coffeeSource : ["src/quickdraw.coffee", "src/base/**.coffee", "src/bindings/**.coffee"],
    tests : ["test/**/*.coffee"],
    typeDeclaration: "src/quickdraw.d.ts"
};

// Files
let CONCAT_FILE = "quickdraw.coffee";
let COMPILED_FILE = "quickdraw.js";
let MINIFIED_FILE = "quickdraw.min.js";

// Folders
let BUILD_FOLDER = "bin";
let LCOV_FILE = `${BUILD_FOLDER}/coverage.lcov`;
let XUNIT_FILE = `${BUILD_FOLDER}/coverage.xml`;
let COVERAGE_FOLDER = `${BUILD_FOLDER}/coverage`;
let RELEASE_FOLDER = "lib";
let CLEAN_UP = [BUILD_FOLDER, RELEASE_FOLDER, COVERAGE_FOLDER, LCOV_FILE];

let getHeaderAddition = function(debug = false) {
    let pkg = require("./package.json");

    if (debug) {
        pkg.version = `custom build based on source of ${pkg.version}`;
    } else {
        pkg.version = `v${pkg.version}`;
    }

    let content = [
        "/**",
        " * <%= name %> - <%= description %>",
        " * @version <%= version %>",
        " * @channel <%= channel %>",
        " */",
        ""
    ];
    return header(content.join("\n"), {
        name        : pkg.name,
        description : pkg.description,
        version     : pkg.version,
        channel     : args.channel
    });
};

gulp.task("clean", () =>
    // return the promise result to signal async
    del(CLEAN_UP)
);

gulp.task("compile", ["clean"], function() {
    let source = PATHS.coffeeSource;
    if (args.debug) {
        source.push("src/debug/**.coffee");
    }
    return gulp.src(source)
        .pipe(concat(CONCAT_FILE))
        .pipe(coffee())
        .pipe(rename(COMPILED_FILE))
        .pipe(gulp.dest(BUILD_FOLDER));
});

gulp.task("compile:coverage", ["clean"], () =>
    gulp.src(PATHS.coffeeSource)
        .pipe(coffeeCov({
            bare : true
        }))
        .pipe(concat(COMPILED_FILE))
        .pipe(gulp.dest(BUILD_FOLDER))
);

gulp.task("test", ["clean", "compile"], () =>
    gulp.src(PATHS.tests, { read : false })
        .pipe(mocha({
            reporter : "spec"
        }))
);

gulp.task("test:coverage", ["clean", "compile:coverage"], () =>
    gulp.src(PATHS.tests, { read : false })
        .pipe(mocha({
            reporter : "mocha-multi",
            reporterOptions : {
                spec : {
                    stdout : "-"
                },
                "mocha-lcov-reporter" : {
                    stdout : LCOV_FILE
                },
                "xunit" : {
                    stdout : XUNIT_FILE
                }
            }
        }))
);

gulp.task("coverage", ["test:coverage"], shell.task([
    `sleep 1 && genhtml ${LCOV_FILE} -o ${COVERAGE_FOLDER}`
]));

gulp.task("minify", ["compile"], () =>
    gulp.src(`${BUILD_FOLDER}/${COMPILED_FILE}`)
        .pipe(uglify())
        .pipe(rename(MINIFIED_FILE))
        .pipe(gulp.dest(BUILD_FOLDER))
);

gulp.task("bump", ["minify", "test"], () =>
    gulp.src("./package.json")
        .pipe(bump({
            type : args.type,
            preid : 'rc'
        }))
        .pipe(gulp.dest("./"))
);

gulp.task("release:organize", ["bump"], () =>
    gulp.src([`${BUILD_FOLDER}/${COMPILED_FILE}`, `${BUILD_FOLDER}/${MINIFIED_FILE}`, PATHS.typeDeclaration])
        .pipe(getHeaderAddition())
        .pipe(gulp.dest(RELEASE_FOLDER))
        .pipe(prompt.confirm({
            message: "All tests have passed, do you want to publish this to npm?",
            default: false
        }))
);

gulp.task("release", ["release:organize"], function(cb) {
    let pkg = require("./package.json");
    return npm.load(pkg, function(err) {
        if (err) { return cb(err); }

        // disable the progress bar as it doesn't work well with gulp
        npmlog.disableProgress();

        // set the tag to the appropriate channel
        npm.config.set("tag", args.channel);

        // publish the repository
        return npm.commands.publish(cb);
    });
});

gulp.task("install", ["clean", "compile"], function() {
    if (args.dir == null) {
        console.error("No directory specified for installation, use --dir flag");
        process.exit(1);
    }

    // set default out if none defined
    return gulp.src([`${BUILD_FOLDER}/${COMPILED_FILE}`, PATHS.typeDeclaration])
        .pipe(getHeaderAddition(true))
        .pipe(gulp.dest(args.dir));
});

gulp.task("default", ["clean", "compile"]);

function __in__(needle, haystack) {
  return Array.from(haystack).indexOf(needle) >= 0;
}