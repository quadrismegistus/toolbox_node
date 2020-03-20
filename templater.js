var nunjucks = require('nunjucks')
// nunjucks.configure('templates/');
nunjucks.configure('templates/', { autoescape: true, express: app });
