#!/usr/bin/env node

const fs = require('fs');
const chalk = require('chalk');
const program = require('commander');
const StyleStats = require('../lib/stylestats');
const Format = require('../lib/format');
const specs = require('../lib/specs');
const util = require('../lib/util');

program
  .version(require('../package.json').version)
  .usage('[options] <file ...>')
  .option('-c, --config <path>', 'set configurations')
  .option('-f, --format <format>', 'set the output format <json|html|md|csv>')
  .option('-t, --template <path>', 'set the template path for output formant')
  .option('-s, --specs <path>', 'run test with your test specs file')
  .option('-n, --number', 'show only numeral metrics')
  .option('-m, --mobile', 'set the mobile user agent')
  .parse(process.argv);

if (program.args.length === 0) {
  console.log(chalk.red('\n No input file specified.'));
  program.help();
}

// Config
const config = {
  requestOptions: {
    headers: {}
  }
};
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/10.0 Mobile/14A5297c Safari/602.1';
const numberConfig = {
  published: false,
  paths: false,
  mostIdentifierSelector: false,
  lowestCohesionSelector: false,
  uniqueFontFamilies: false,
  uniqueFontSizes: false,
  uniqueColors: false,
  propertiesCount: false
};
let userConfig = {};

if (program.mobile) {
  config.requestOptions.headers['User-Agent'] = MOBILE_UA;
}
if (program.number) {
  Object.assign(config, numberConfig);
}
if (program.config && util.isFile(program.config)) {
  const configString = fs.readFileSync(program.config, {
    encoding: 'utf8'
  });
  try {
    userConfig = JSON.parse(configString);
  } catch (err) {
    throw err;
  }
} else if (util.isObject(program.config)) {
  userConfig = config;
}
Object.assign(config, userConfig);

// Parse
const stats = new StyleStats(program.args, config);
stats.parse()
  .then(result => {
    const format = new Format(result);
    // Test specs
    if (program.specs) {
      specs(result, program.specs);
      return;
    }
    // Custom format
    if (fs.existsSync(program.template)) {
      format.setTemplate(fs.readFileSync(program.template, {encoding: 'utf8'}));
      console.log(format.getFormattedText());
      return;
    }
    // Other formants
    switch (program.format) {
      case 'md':
        console.log(format.toMarkdown());
        break;
      case 'html':
        console.log(format.toHTML());
        break;
      case 'json':
        console.log(format.toJSON());
        break;
      case 'csv':
        format.toCSV().then(csv => console.log(csv));
        break;
      default:
        console.log(` StyleStats!
${format.toTable()}`);
        break;
    }
  })
  .catch(err => console.log(chalk.red(` [ERROR] ${err.message}`)));
