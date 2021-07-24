const fs = require('fs');
const generateConfig = require("./generateConfig");

const config = generateConfig.exec();

fs.writeFile('./config.js', JSON.stringify(config), { flag: 'w+' }, function (err) {
  if (err) return console.log(err);
});