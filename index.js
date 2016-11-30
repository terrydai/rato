var path = require('path')
var {basename, extname} = path;
var Metalsmith = require('metalsmith');
var inquirer = require('inquirer');
var async = require('async');
// var meta = require('./meta.json')
var handlebars = require('handlebars')
var _ = require('lodash')
var chalk = require('chalk')
var metadata = {}



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

    if( _.get(metadata, '_meta.hooks.afterPrompt')) {
      metadata._meta.hooks.afterPrompt(metadata)
    }
    done()
  })
}


/**
 * Build.
 */
function run(){
  // console.info('anwsers: ',   metadata)

  var metalsmith = Metalsmith(__dirname)
  .source(metadata._source)
  .destination(metadata._destination)
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


    console.log()
    console.log( chalk.blue('# Copy files'))
    for (var file in files) {

      // console.log( file, basename(file) )
      var content = files[file].contents.toString()

      delete files[file]


      //fix
      // file = file.replace(/\\/g, '/');
      var newContent = content
      try{
        newContent = handlebars.compile(content)(metadata)
      }catch(e){
        //throws errors
        console.error( chalk.yellow("[WARN]", `${file} compiles failed, use the original file instead`) )
        // continue
      }

      //file replacement

      // var newFile = handlebars.compile(file)(metadata).replace(/\//g, '\\')
      var pairs = file.split(path.sep).map(function(p){
        return handlebars.compile(p)(metadata)
      })
      var newFile = pairs.join(path.sep)

      console.log( chalk.green("[OK]") , file , " =======>  ",  newFile)

      files[newFile] =  {contents: new Buffer( newContent)};
    }

    done();
  }
}



module.exports = function(meta, source, destination){

  metadata._meta = meta
  metadata._source = source
  metadata._destination = destination
  metadata._destinationBaseName = path.basename(destination)

  console.log(chalk.blue('# Setup a new webapp'))
  if( _.get(metadata, '_meta.hooks.beforePrompt')) {
    metadata._meta.hooks.beforePrompt(metadata)
  }
  ask( meta.prompts, metadata, run)
}
