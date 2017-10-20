const CONFIG = require('./config.js');
var mysql = require('mysql');

var exports = module.exports = {};

const conn = mysql.createConnection({
    host: CONFIG.HOST,
    user: CONFIG.USER,
    password: CONFIG.PASS,
    database: CONFIG.DB,
    port: 3306
});

if(CONFIG.TESTING == false) {

    conn.connect(function (err) {
        if (err) throw err;
        console.log("Connected");
    })

}

//Insert
exports.insertChangeStorage = function(command, username, userid, mentions, callback) {
    
	var dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
	conn.query("INSERT INTO `changeStorage` (command, username, userid, mentions, created, updated) VALUES (?, ?, ?, ?, ?, ?)", [command, username, userid, mentions, dateNow, dateNow], function (err, result) {
    	if (err) callback(err, null);
    	else callback(null, result);
    });
};

exports.updateChangeStorage = function(command, username, userid, mentions, callback) {
    
	var dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
	conn.query("UPDATE `changeStorage`  SET username = ?, mentions = ?, updated = ? WHERE command = ? AND userid = ?", [username, mentions, dateNow, command, userid], function (err, result) {
    	if (err) callback(err, null);
    	else callback(null, result);
    });
};

//Get from Storage
exports.checkChangeStorage = function(command, userid, callback) {
	conn.query("SELECT * FROM `changeStorage` WHERE `command` = ? AND `userid` = ?", [command, userid], function(err, result, fields) {
		if(err) callback(err, null);
		else callback(null, result);
	});
};



//////// RANGE QUERIES
exports.getUserRange = function(userid, callback) {
    conn.query("SELECT * FROM `range` WHERE `userid` = ?", [userid], function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
};

//Update range range
exports.updateRangeRange = function(userid, name, range, callback) {
    
    var dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
    conn.query("UPDATE `range`  SET ran = ?, updated = ? WHERE userid = ? AND name = ?", [range, dateNow, userid, name], function (err, result) {
        if (err) callback(err, null);
        else callback(null, result);
    });
};

//Get all active range entries
exports.getActiveRanges = function(callback) {
    conn.query("SELECT * FROM `range` WHERE `active` = 1", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
};

//Update range status
exports.updateRangeStatus = function(userid, name, status, callback) {
    
    var dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
    conn.query("UPDATE `range`  SET active = ?, updated = ? WHERE userid = ? AND name = ?", [status, dateNow, userid, name], function (err, result) {
        if (err) callback(err, null);
        else callback(null, result);
    });
};

//Update range rares status
exports.updateRangeType = function(userid, name, type, status, callback) {
    var dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
    conn.query("UPDATE `range` SET `"+type+"` = ?, updated = ? WHERE userid = ? AND name = ?", [status, dateNow, userid, name], function (err, result) {
        if (err) callback(err, null);
        else callback(null, result);
    });
};

//Insert Range Entry
exports.createRangeEntry = function(username, userid, name, range, lat, long, active, callback) {
    
    var dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
    conn.query("INSERT INTO `range` (username, userid, name, ran, lat, lon, active, rares, pokemon, starters, raids, raid_levels, mentions, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [username, userid, name, range, lat, long, active, 1, 0, 0, 0, "", 0, dateNow, dateNow], function (err, result) {
        if (err) callback(err, null);
        else callback(null, result);
    });
};

//Update raid_levels
exports.updateRaidLevels = function(userid, raid_levels, callback) {
    var dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
    conn.query("UPDATE `range` SET `raid_levels` = ?, updated = ? WHERE userid = ?", [raid_levels, dateNow, userid], function (err, result) {
        if (err) callback(err, null);
        else callback(null, result);
    });
}

exports.getActiveRaidRanges = function(callback) {
    conn.query("SELECT * FROM `range` WHERE `active` = 1 AND `raids` = 1", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
};

//Delete range entry
exports.deleteRange = function(userid, callback) {
       conn.query("DELETE FROM `range` WHERE userid = ?", [userid], function (err, result) {
            if (err) callback(err, null);
            else callback(null, result);
        }); 
}



//Get all range users
exports.allRangeUsers = function(callback) {
    conn.query("SELECT * FROM `range`", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}

//Get all change users
exports.allChangeUsers = function(callback) {
    conn.query("SELECT * FROM `changeStorage`", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}


exports.removeDeadChangeUser = function(userid, callback) {
    conn.query("DELETE FROM `changeStorage` WHERE `userid` = ?", [userid], function(err, result) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}

exports.removeDeadRangeUser = function(userid, callback) {
    conn.query("DELETE FROM `range` WHERE `userid` = ?", [userid], function(err, result) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}

//Mentions Queries
exports.addMentionsEntry = function(pid, pname, type, mention, callback) {
    var dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
    conn.query("INSERT INTO `mentions` (pid, pname, type, mention, created, updated) VALUES (?,?,?,?,?,?)", [pid, pname, type, mention, dateNow, dateNow], function(err, result) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}

//Get mention by name
exports.getMentionByName = function(pname, callback) {
    conn.query("SELECT * FROM `mentions` WHERE pname=?", [pname], function(err, result) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

exports.getAllMentions = function(callback) {
    conn.query("SELECT * FROM `mentions`", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}

exports.deleteMentionEntry = function(pid, callback) {
    conn.query("DELETE FROM `mentions` WHERE pid=?",[pid], function(err, result) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}


//Pokemon List Queries
//Get all PokemonList entries
exports.getPokemonAllEntries = function(callback) {
    conn.query("SELECT * FROM `pokemonlist`", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}

//Get Active Pokemon Entries
exports.getPokemonActiveEntries = function(callback) {
    conn.query("SELECT * FROM `pokemonlist` WHERE active = 1", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}

//Get Pokemon by Name
exports.getPokemonByName = function(pname, callback) {
    conn.query("SELECT * FROM `pokemonlist` WHERE name=?", [pname], function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}

//Get Pokemon by ID
exports.getPokemonByID = function(pid, callback) {
    conn.query("SELECT * FROM `pokemonlist` WHERE pid=?", [pid], function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}


exports.getPokemonGeneration = function(genID, callback) {
    conn.query("SELECT * FROM `pokemonlist` WHERE gen=?", [genID], function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    });
}



////////////////
//Ditto Stats //
////////////////

//Day-Night
exports.usageCountDayNight = function(callback) {
    conn.query("SELECT COUNT(*) as count FROM `changeStorage`", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

//Range Count
exports.usageCountRange = function(callback) {
    conn.query("SELECT COUNT(*) as count FROM `range`", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

//Active Range Count
exports.usageActiveCountRange = function(callback) {
    conn.query("SELECT COUNT(*) as count FROM `range` WHERE `active` = 1", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

//Rares Count
exports.usageRaresCountRange = function(callback) {
    conn.query("SELECT COUNT(*) as count FROM `range` WHERE `rares` = 1", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

//Pokemon Count
exports.usagePokemonCountRange = function(callback) {
    conn.query("SELECT COUNT(*) as count FROM `range` WHERE `pokemon` = 1", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

//Starters Count
exports.usageStartersCountRange = function(callback) {
    conn.query("SELECT COUNT(*) as count FROM `range` WHERE `starters` = 1", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

//Raid Count
exports.usageRaidCountRange = function(callback) {
    conn.query("SELECT COUNT(*) as count FROM `range` WHERE `raids` = 1", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

//Mentions Count
exports.usageMentionsCountRange = function(callback) {
    conn.query("SELECT COUNT(*) as count FROM `range` WHERE `mentions` = 1", function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

//Distance Count
exports.usageDistanceCountRange = function(ran, callback) {
    conn.query("SELECT COUNT(*) as count FROM `range` WHERE `ran` = ?", [ran], function(err, result, fields) {
        if(err) callback(err, null);
        else callback(null, result);
    }); 
}

exports.dailyDMCount = function(type, name, value = null, callback) {
    conn.query("SELECT COUNT(*) as cnt FROM `stats` WHERE `type` = ? AND `name` = ? AND `date` = CURDATE()", [type, name], function(err, result, fields) {
        if(err) callback(err, null);
        else {
            if(result[0].cnt == 0) { //No entry for today
                conn.query("INSERT INTO `stats` (type, name, count, date) VALUES (?, ?, ?, CURDATE())", [type, name, (value == null ? 1 : value)], function(err, result) {
                    if(err) callback(err, null);
                    else callback(null, result);

                });

            }
            else {
                conn.query("UPDATE `stats` SET `count` = `count`+? WHERE `type` = ? AND `name` = ? AND date = CURDATE()", [value, type, name], function(err, result) {
                    if(err) callbacK(err, null);
                    else callback(null, result);
                });
            }
        }


    });

}


