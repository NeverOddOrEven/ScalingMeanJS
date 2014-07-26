function CommandLineParser() {
  var PORT_FLAG = '-p';

  function parse() {
    var params = {};
    var tokens = process.argv;

    var i = tokens.indexOf(PORT_FLAG);
    if(i > -1) {
      if (!isNaN(tokens[i+1])) {
        params.port = tokens[i+1];
      }
    }

    return params;
  }

  return {
    parse: parse
  }
};

module.exports = exports = new CommandLineParser();