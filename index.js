var path = require('path')
var {basename, extname} = path;
var Metalsmith = require('metalsmith');
var inquirer = require('inquirer');
var async = require('async');
var meta = require('./meta.json')
var handlebars = require('handlebars')


function ask (prompts, data, done) {

  async.eachSeries(Object.keys(prompts), function (key, next) {
    prompt(data, key, prompts[key], next)
  }, done)
}

function prompt (data, key, prompt, done) {
  // skip prompts whose when condition is not met
  inquirer.prompt([{
    type: prompt.type,
    name: key,
    message: prompt.message || prompt.label || key,
    default: prompt.default,
    choices: prompt.choices || [],
    validate: prompt.validate || function () { return true }
  }]).then(function (answers) {
    if (Array.isArray(answers[key])) {
      data[key] = {}
      answers[key].forEach(function (multiChoiceAnswer) {
        data[key][multiChoiceAnswer] = true
      })
    } else {
      data[key] = answers[key]
    }
    done()
  })
}

var metadata = {}
ask(meta.prompts, metadata, run)


/**
 * Build.
 */
function run(){
  console.info('anwsers: ',   metadata)


  var metalsmith = Metalsmith(__dirname)
  .use(concat)
  .build(function(err){
    if (err) throw err;
  });

/**
 * Concat plugin.
 *
 * @param {Object} files
 * @param {Metalsmith} metalsmith
 * @param {Function} done
 */

  function concat(files, metalsmith, done){
    // console.log(files, metalsmith.metadata(), done)
    var css = '';


    for (var file in files) {

      // console.log( file, basename(file) )
      var content = files[file].contents.toString()

      delete files[file]


      //fix
      file = file.replace(/\\/g, '/');

      var newContent = handlebars.compile(content)(metadata)
      var newFile = handlebars.compile(file)(metadata).replace(/\//g, '\\')


      console.log( file , newFile)

      files[newFile] =  {contents: new Buffer( newContent)};
    }

    done();
  }
}
