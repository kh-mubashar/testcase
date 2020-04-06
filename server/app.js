var express = require('express');
var favicon = require('serve-favicon');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var request = require('request');
var path = require('path');
var fs = require('fs');

/**********************************************************************
    SETTING UP EXRESS SERVER
***********************************************************************/
var app = express();

app.use(require('helmet')()); // security package
app.use(require('compression')()); // gzip compression

app.set('trust proxy', 1); // trust first proxy

// Session Storage Configuration:
var secretKey = (Date.now().toString(36) + Math.random().toString(36).substr(2, 9));
var cookieName = 'iridium';
var hour = 3600000;
var sessionOptions = {
    secret: secretKey,
    name: cookieName, // give a custom name for your cookie here
    resave: false,
    saveUninitialized: false,
    cookie: {
        sameSite: true,
        httpOnly: true,
        expires: new Date(Date.now() + hour),
        maxAge: hour,
    }
};

/* if (app.get('env') === 'production') {
    sessionOptions.cookie.secure = true; // serve secure cookies
} */

app.use(cookieParser(secretKey));
app.use(session(sessionOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));


/****************************************************************************
    SET UP EXPRESS ROUTES
*****************************************************************************/

var api_opc = 'http://ec2-54-88-0-215.compute-1.amazonaws.com:80';
var api_uri = 'http://ec2-54-88-0-215.compute-1.amazonaws.com:81';
var api_tagRecent = 'http://ec2-54-88-0-215.compute-1.amazonaws.com:83';
var api_uri_2 = 'http://ec2-54-88-0-215.compute-1.amazonaws.com:84';
var api_alarms = 'http://ec2-54-88-0-215.compute-1.amazonaws.com:85';
var api_username = 'administrator';
var api_password = '7eRmina7oR';
var _session;


// no restrictions

/**handle favicon */
app.use(favicon(path.join(__dirname, '../public/favicon.ico')));
//app.get('/favicon.ico', express.static(path.join(__dirname, '../public/favicon.ico')));

app.use(['/bootstrap.min.css', '/login/bootstrap.min.css'], express.static(path.join(__dirname, '../public/bower_components/bootstrap/dist/css/bootstrap.min.css')));

/**handle login page */
app.get(['/login', '/login/', '/login?credentials=invalid'], function (req, res, next) {
    //res.sendFile(path.join(__dirname + '/../public/login.html'));
    var login_html = fs.readFileSync(path.join(__dirname + '/../public/login.html')).toString();
    if (login_html) {
        res.send(login_html.replace('%year%', (new Date()).getFullYear()));
    }
    return;

});

/* app.post('/login', function (req, res, next) {
    if (req.body.user_id && req.body.user_id === 'user' && req.body.user_password && req.body.user_password === 'pass') {
        req.session.authenticated = true;
        res.redirect('/');
    } else {
        res.redirect('/login?credentials=invalid');
        return;
    }
});
 */

var credentials = [];
app.post('/login', function (req, res, next) {
    // console.log(req.url, req.body);
    if (req.body.user_id && req.body.user_password) {
        credentials = ({
            'user_id': req.body.user_id, 'password': req.body.user_password
        });

        var options = {
            url: api_uri + '/signin',
            method: req.method,
            form: req.body,
            headers: {
                'username': api_username,
                'password': api_password,
            }
        };
        request(options, function (error, response, body) {
            var requestBody = JSON.parse(body);
            if (!error && response.statusCode === 200) {
                _session = req.session;
                _session.user_id = req.body.user_id;
                _session.organization_id = requestBody.organization_id;
                _session.currentServerTime = requestBody.currentServerTime;

                if (requestBody.status === 'valid user') {
                    req.session.authenticated = true;

                    // console.log(req.url, req.session.authenticated, req.cookies.pageUrl);
                    if (req.cookies.pageUrl) {
                        res.redirect(req.cookies.pageUrl)
                    } else {
                        res.redirect('/');
                    }
                } else {
                    res.redirect('/login?credentials=invalid');
                    return;
                }
            } else {
                res.redirect('/login?error=request');
                return;
            }
        });
    } else {
        res.redirect('/login?credentials=invalid');
        return;
    }
});
app.get('/getFingerPrint', function (req, res, next) {
    'use strict';
    var options = {

        url: api_alarms + '/getFingerPrint/' + req.session.user_id + '/' + req.session.organization_id.toLowerCase(),
        headers: {
            'username': api_username,
            'password': api_password
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/createFingerPrint', function (req, res, next) {
    'use strict';
    var options = {
        url: api_alarms + '/createFingerPrint',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            "Content-Type": "application/json"
        },
    };
    // console.log('test', options);
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/updateFingerPrint', function (req, res, next) {
    'use strict';
    var options = {
        url: api_alarms + '/updateFingerPrint',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            "Content-Type": "application/json"
        },
    };
    // console.log('test', options);
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.get('/removeFingerPrint/:fingerPrintID', function (req, res, next) {
    'use strict';
    var options = {

        url: api_alarms + '/removeFingerPrint/' + req.params.fingerPrintID,
        headers: {
            'username': api_username,
            'password': api_password,
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.get('/getFingerPrintComments/:fingerPrintID', function (req, res, next) {
    'use strict';
    var options = {

        url: api_alarms + '/getFingerPrintComments/' + req.params.fingerPrintID,
        headers: {
            'username': api_username,
            'password': api_password,
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.get('/removeFingerPrintComment/:fingerPrintID/:commentID', function (req, res, next) {
    'use strict';
    var options = {

        url: api_alarms + '/removeFingerPrintComment/' + req.params.fingerPrintID + '/' + req.params.commentID,
        headers: {
            'username': api_username,
            'password': api_password,
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.get('/getFingerPrintAlerts/:fingerPrintID', function (req, res, next) {
    'use strict';
    var options = {

        url: api_alarms + '/getFingerPrintAlerts/' + req.params.fingerPrintID,
        headers: {
            'username': api_username,
            'password': api_password,
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/addFingerPrintComment', function (req, res, next) {
    'use strict';
    //console.log('req.body', typeof req.body, req.body)
    var options = {
        url: api_alarms + '/addFingerPrintComment',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            "Content-Type": "application/json"
        },
    };
    request(options, function (error, response, body) {
        if (error) {
            //console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/derivedTag/:derivedformula/:derivedTagName/:derivedDescription/:derivedTagId/:organizationId', function (req, res, next) {
    'use strict';
    // console.log('req.body', typeof req.body, req.body)
    var options = {
        url: api_uri_2 + '/create/derivedTag',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'userId': req.session.user_id,
            'username': api_username,
            'password': api_password,
            'formula': req.params.derivedformula,
            'derivedTagName': req.params.derivedTagName,
            'description': req.params.derivedDescription,
            'derivedTagId': req.params.derivedTagId,
            'organizationId': req.params.organizationId,
            "Content-Type": "application/json"
        },
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.get('/aggregateTag/:tagName/:aggregatedTagName/:aggregationType/:aggregationInterval/:aggregationUnit/:description/:aggregatedTagId/:organizationId', function (req, res, next) {
    'use strict';
    var options = {
        url: api_uri_2 + '/create/aggregatedTag',
        headers: {
            'userId': req.session.user_id,
            'username': api_username,
            'password': api_password,
            'tagId': req.params.tagName,
            'aggregatedTagName': req.params.aggregatedTagName,
            'aggregationType': req.params.aggregationType,
            'aggregationInterval': req.params.aggregationInterval,
            'aggregationUnit': req.params.aggregationUnit,
            'description': req.params.description,
            'aggregatedTagId': req.params.aggregatedTagId,
            'organizationId': req.params.organizationId
        }
    };
    // console.log(options.headers);
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.get('/getTagList', function (req, res, next) {
    'use strict';
    var options = {

        url: api_tagRecent + '/getTagsDetail/' + req.session.organization_id,
        headers: {
            'username': api_username,
            'password': api_password
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.get('/getRecentTagList', function (req, res, next) {
    'use strict';

    var options = {
        url: api_tagRecent + '/retrieveFromTagRecent/' + req.session.user_id,
        headers: {
            'username': api_username,
            'password': api_password
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/insertTag', function (req, res, next) {
    'use strict';
    var options = {
        url: api_tagRecent + '/insertIntoTagRecent',
        method: req.method,
        formData: req.body,
        headers: {
            'username': api_username,
            'password': api_password
        },
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/removeTag', function (req, res, next) {
    'use strict';
    var options = {
        url: api_tagRecent + '/removeFromTagRecent',
        method: req.method,
        formData: req.body,
        headers: {
            'username': api_username,
            'password': api_password
        },
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.get('/getTagTrends/:tagName/:endDate/:startDate', function (req, res, next) {
    'use strict';
    var options = {
        url: api_uri_2 + '/getVisualizationData/' + req.params.tagName + '/' + req.params.endDate + '/' + req.params.startDate,
        headers: {
            "Content-Type": "application/json",
            'username': api_username,
            'password': api_password
        },
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            //res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/valueSearch/:startDate/:endDate/:interval/:intervalUnit', function (req, res, next) {
    'use strict';
    var options = {
        url: api_uri_2 + '/retrieve/valueBasedSearch',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            'start_date': req.params.endDate,
            'end_date': req.params.startDate,
            'interval_unit': req.params.interval,
            'interval': req.params.intervalUnit,
            "Content-Type": "application/json"
        },
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/getOPCUAInstance', function (req, res, next) {
    'use strict';
    var options = {
        url: api_opc + '/getOPCUAInstance',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            'organizationId': req.session.organization_id.toLowerCase(),
            "Content-Type": "application/json"
        },
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/updateOPCUAInstance/:opcua_name/:url/:description', function (req, res, next) {
    'use strict';
    var options = {
        url: api_opc + '/updateOPCUAInstance',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            'organizationId': req.session.organization_id.toLowerCase(),
            "Content-Type": "application/json",
            "opcua_name": req.params.opcua_name,
            "url": req.params.url,
            "description": req.params.description,
        },
    };
    console.log('test', options);
    request(options, function (error, response, body) {
        if (error) {
            console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/deleteOPCUAInstance/:opcua_name', function (req, res, next) {
    'use strict';
    var options = {
        url: api_opc + '/deleteOPCUAInstance',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            'organizationId': req.session.organization_id.toLowerCase(),
            "Content-Type": "application/json",
            "opcua_name": req.params.opcua_name
        },
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/addOPCUAInstance/:opcua_name/:url/:description', function (req, res, next) {
    'use strict';
    // console.log('req.body', req.params);
    var options = {
        url: api_opc + '/addOPCUAInstance',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            'organizationId': req.session.organization_id.toLowerCase(),
            "Content-Type": "application/json",
            "opcua_name": req.params.opcua_name.toLowerCase(),
            "url": req.params.url,
            "description": req.params.description,
        },
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/getOPCUATag/:opcua_name', function (req, res, next) {
    'use strict';
    var options = {
        url: api_opc + '/getOPCUATag',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            'organizationId': req.session.organization_id.toLowerCase(),
            "Content-Type": "application/json",
            "opcua_name": req.params.opcua_name
        },
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/updateOPCUATag/:opcua_unitname/:tag_name/:description/:opcua_tag_name', function (req, res, next) {
    'use strict';
    var options = {
        url: api_opc + '/updateOPCUATag',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            'organizationId': req.session.organization_id.toLowerCase(),
            "Content-Type": "application/json",
            "opcua_name": req.params.opcua_unitname,
            "tag_name": req.params.tag_name,
            "description": req.params.description,
            "opcua_tag_name": req.params.opcua_tag_name,
        },
    };
    console.log('test', options);
    request(options, function (error, response, body) {
        if (error) {
            console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/deleteOPCUATag/:opcua_name/:tag_name', function (req, res, next) {
    'use strict';
    var options = {
        url: api_opc + '/deleteOPCUATag',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            "Content-Type": "application/json",
            'username': api_username,
            'password': api_password,
            'organizationId': req.session.organization_id.toLowerCase(),
            "opcua_name": req.params.opcua_name,
            "tag_name": req.params.tag_name
        },
    };

    request(options, function (error, response, body) {
        if (error) {
            console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.post('/addOPCUATag/:opcua_name/:tag_name/:description/:opcua_tag_name', function (req, res, next) {
    'use strict';
    var options = {
        url: api_opc + '/addOPCUATag',
        method: req.method,
        body: req.body,
        json: true,
        headers: {
            'username': api_username,
            'password': api_password,
            'organizationId': req.session.organization_id.toLowerCase(),
            "Content-Type": "application/json",
            "opcua_name": req.params.opcua_name,
            "tag_name": req.params.tag_name.toUpperCase(),
            "opcua_tag_name": req.params.opcua_tag_name,
            "description": req.params.description,
        },
    };
    request(options, function (error, response, body) {
        if (error) {
            console.log(error);
        } else if (!error && response.statusCode === 200) {
            res.send(body);
        }
    });
});
app.get('/getTagsDetailForTagManagement', function (req, res, next) {
    'use strict';
    var options = {

        url: api_tagRecent + '/getTagsDetailForTagManagement/' + req.session.organization_id,
        gzip: true,
        headers: {
            'username': api_username,
            'password': api_password
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            // console.log(error);
            res.redirect('/login?credentials=invalid');
            return;
        } else if (!error && response.statusCode === 200) {
            console.log(body);
            res.send(body);
        }
    });
});
/**handle logout page */
app.get('/logout', function (req, res, next) {
    req.session.destroy();
    res.clearCookie(cookieName);
    res.clearCookie('pageUrl');
    res.redirect('/');
    return;
});


/**handle all unauthorised requrests */
app.use(function (req, res, next) {
    // console.log(req.url, req.session.authenticated, req.cookies);

    if (!req.session.authenticated) {
        res.redirect('/login/');
        return;
    }
    next();
});



/**
 * secure routes
 */


/* app.get('/user_info', function (req, res, next) {
    setTimeout(function(){
        res.send({
            user_id: logged_user_id
        });
    }, 1000);
}); */


app.get('/', function (req, res, next) {
    //res.sendFile(path.join(__dirname + '/index.html'));
    // console.log('req.session', req.session.user_id, req.session.organization_id)
    var index_html = fs.readFileSync(path.join(__dirname + '/../public/index.html')).toString();
    if (index_html) {
        res.send(index_html.replace('%user_id%', req.session.user_id).replace('%organization_id%', req.session.organization_id));

    }
});


app.get('/about', function (req, res, next) {
    res.send('about');
});

/**handle bower_components */
app.use(express.static(path.join(__dirname, '../')));

/**handle not found */
app.use(function (req, res) {
    res.status(404).end('error');
    //res.redirect('/');
});

/**application server */
var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('Application running on http://localhost:%s', port);
});