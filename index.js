const Discord = require('discord.js');
const bot = new Discord.Client();
var distance = require('gps-distance');
var async = require('async');

const CONFIG = require('./config.js');
const mysql = require('./mysql.js');

const TOKEN = CONFIG.TOKEN;
const PREFIX = CONFIG.PREFIX;

const onlineStatuses = ['online', 'idle'];

if (bot.login(CONFIG.TOKEN)) {
    console.log('Bot connected');
}
else {
    console.log('Bot failed to connect. Oh noes!');
}


//TODO
//This will need clean up into array format if we add more
//Accessors for last message id within runs
var starters_lmi = lastMessageID();
var pokemon_lmi = lastMessageID();
var rares_lmi = lastMessageID();
var raids_lmi = lastMessageID();

var guild_members = lastMessageID();

//NEW MENTIONS - Built from Guild Roles
var pokemonMentions = lastMessageID();
var raidMentions = lastMessageID();

//Main Bot control
bot.on('ready', () => {

    //Run this to get all guild roles setup
    getGuildMentions(function(data) {});

    //Server data
    var guild = bot.guilds.get(CONFIG.GUILD);

    guild.fetchMembers().then(function(gms) { guild_members.set(gms)});

    //--Source Channels
    var la_starters = bot.channels.get(CONFIG.STARTERS_CHAN);
    var la_pokemon = bot.channels.get(CONFIG.POKEMON_CHAN);
    var la_rares = bot.channels.get(CONFIG.RARES_CHAN);
    var la_raids = bot.channels.get(CONFIG.RAID_ALERTS);
    
    //--Post Raid channels
    var RAID1 = bot.channels.get(CONFIG.RAID1);
    var RAID2 = bot.channels.get(CONFIG.RAID2);
    var RAID3 = bot.channels.get(CONFIG.RAID3);
    var RAID4 = bot.channels.get(CONFIG.RAID4);
    var RAID5 = bot.channels.get(CONFIG.RAID5);
    var RAID6 = bot.channels.get(CONFIG.RAID6);

    //--Test channels
    var TEST_NA = bot.channels.get(CONFIG.TEST_NA);

    //-- Raid Channels
    var raid_channels = {"1": RAID1, "2": RAID2, "3": RAID3, "4": RAID4, "5": RAID5, "6": RAID6 };
 
    //Bot run inits
    async.series([
        function(callback) { if(CONFIG.RUN_RARES === true) { run_bot(la_rares, la_rares, rares_lmi, CONFIG.DEFAULT_LIMIT_RARES, "rares"); } callback(); },
        function(callback) { if(CONFIG.RUN_POKEMON === true) { run_bot(la_pokemon, la_pokemon, pokemon_lmi, CONFIG.DEFAULT_LIMIT_POKEMON, "pokemon"); } callback(); },
        function(callback) { if(CONFIG.RUN_STARTERS === true) { run_bot(la_starters, la_starters, starters_lmi, CONFIG.DEFAULT_LIMIT_POKEMON, "starters"); } callback(); },
        function(callback) { if(CONFIG.RUN_RAIDS === true) { run_raid_bot(la_raids, raid_channels, raids_lmi); } callback(); }
    ]);

    //Bots continuous run
    setInterval(function () {
        async.series([
            function(callback) { if(CONFIG.RUN_RARES) { run_bot(la_rares, la_rares, rares_lmi, CONFIG.DEFAULT_LIMIT_RARES, "rares"); } callback(); },
            function(callback) { if(CONFIG.RUN_POKEMON) { run_bot(la_pokemon, la_pokemon, pokemon_lmi, CONFIG.DEFAULT_LIMIT_POKEMON, "pokemon"); }  callback(); },
            function(callback) { if(CONFIG.RUN_STARTERS) { run_bot(la_starters, la_starters, starters_lmi, CONFIG.DEFAULT_LIMIT_POKEMON, "starters"); } callback(); },
            function(callback) { if(CONFIG.RUN_RAIDS) { run_raid_bot(la_raids, raid_channels, raids_lmi); } callback(); }
        ]);
    }, CONFIG.RUN_EVERY_X_SECONDS * 1000);

    setInterval(function() {
      async.series([
        function(callback) { if(CONFIG.AUTO_REMOVE_LIVEMAP) { removeExpiredLivemap(); } callback(); }
      ]);
    }, 86400);
});


/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////

//RAID BOT
//Supposed to split from single raid channel to multiple channels
function run_raid_bot(la_raids, output_channels, raids_lmi) {

    //Pokemon Mentions for 'Rhydon Boss!'
    var pokemon_list = loadPokemonsList(); //Not used
    var raids_mentions = loadRaidMentions();

    //Default pull of last message id
    if (raids_lmi.get() == "0") {
        //Temp for manual testing
        //raids_lmi.set("341347990528720896");
        raids_lmi.set(la_raids.lastMessageID);
    }

    la_raids.fetchMessages({ limit: CONFIG.DEFAULT_LIMIT_RAIDS, after: raids_lmi.get() })
      .then(
          messages => {

              console.log("= Raids Running...");
              console.log("=== Date: " + new Date().toLocaleString('en-US', { timeZone: 'America/New_York'}));
              console.log(`=== Received ${messages.size} messages`);
              console.log('=== Last Msg ID: ' + raids_lmi.get());
              console.log('=== Limit: ' + CONFIG.DEFAULT_LIMIT_RAIDS);

              //Loop over messages
              messages.forEach(function (message) {

                  async.series([
                      function(callback) {
                          //Duplicate message catcher???
                          if(message.id == raids_lmi.get()) {
                              console.log("DUPLICATE TRIGGER CATCH");
                              return;
                          }
                          callback();
                      },
                      function(callback) {
                          //console.log(message);
                          //console.log(message.embeds[0].thumbnail);
                          //console.log(message.embeds[0].image);

                          var title = message.embeds[0].title;
                          var description = message.embeds[0].description;
                          var level = (message.embeds[0].description).replace("**Level:** ", "").charAt(0);
                          var url = message.embeds[0].url;
                          var thumbnail = message.embeds[0].thumbnail;
                          var image = message.embeds[0].image;

                          //Remove unwanted white space
                          for (var i = 0; i < description.length; i++) {
                              if (description[i] == "\n" && description[i+1] == "\n") {
                                      description = setCharAt(description, i, "");
                                  }                   
                          }                 

                          //Mention code goes here
                          //Get current mon from 'Rhydon Boss!'
                          var current_mon = title.substring(0, title.indexOf(' '));
                          console.log('Current Raid Mon: ' + current_mon);

                          //Get current_mention based on current_mon
                          var current_mention = raids_mentions[current_mon];

                          //Build message to send
                          var msg = title + "\n" + description + "\n" + url + "\n" + current_mention + "\n\n";

                          console.log("==========NEW MESSAGE===========");
                          console.log("Message Title: " + title);
                          console.log("Message Description: " + description);
                          console.log("Raid Level: " + level);
                          console.log("Message Url: " + url);
                          console.log("Mentions: " + current_mention);

                          //RichEmbed
                          var richMessage = new Discord.RichEmbed();
                          richMessage.setTitle(title);
                          richMessage.setDescription(description);
                          richMessage.setURL(url);
                          richMessage.setColor(0x00AE86);                  
                          richMessage.setImage(image.url);
                          richMessage.setThumbnail(thumbnail.url);

                          //Send message to channel 'level'
                          output_channels[level].send(current_mention, { embed: richMessage });

                          console.log("Send Message of " + title + " -to- " + output_channels[level] + " --- Level: " + level);

                          console.log("==========END MESSAGE===========");
                          console.log("Completed Raid Split");
                          callback();
                      },
                      function(callback) {
                        mysql.dailyDMCount("CHANNEL", "RAIDSPLIT", 1, function(err, result) { if(err) console.log(err); });
                        callback();
                      },
                      function(callback) {

                          if(CONFIG.RUN_RAID_RANGE) {
                            //Raid coordinates (lat/long)
                            var title = message.embeds[0].title;
                            var description = message.embeds[0].description;
                            var level = (message.embeds[0].description).replace("**Level:** ", "").charAt(0);
                            var url = message.embeds[0].url;
                            var thumbnail = message.embeds[0].thumbnail;
                            var image = message.embeds[0].image;
                            var raid_coordsString = url.split("=").splice(1);
                            var raid_coords = raid_coordsString[0].split(",");
                            var gmaps = mapUrl(raid_coords[0], raid_coords[1]);

                            //Raid ranges
                            mysql.getActiveRaidRanges(function(err, results) {
                                if(err) console.log("Error retrieving active ranges.");
                                else {
                                    if(results.length == 0) {
                                        console.log("0 range entries found!");
                                    }
                                    else { //work
                                        results.forEach(function(result) {
                                            var user_raw_raidlevels = result.raid_levels;
                                            var user_array_raidlevels = user_raw_raidlevels.split(",");

                                            //console.log("DEBUG: "+ user_raw_raidlevels+" "+level+" "+result.username);

                                            //Check if user has that raid level listed
                                            if(user_array_raidlevels.indexOf(level) > -1) {
                                                console.log(result.username+" has "+level+" in "+user_raw_raidlevels);

                                                //Check distance
                                                var dist = distance(parseFloat(raid_coords[0]), parseFloat(raid_coords[1]), parseFloat(result.lat), parseFloat(result.lon));
                                                if(dist < result.ran) {
                                                  //Send
                                                  bot.fetchUser(result.userid).then(function(user) { 
                                                      user.createDM().then(function(dm) {
                                                          if(CONFIG.RAID_RANGE_DM) {
                                                              if(CONFIG.TESTING === true) console.log("DM disabled.");
                                                              else {
                                                                dm.send({embed: richMsg("Level " + level + " -- " + title.slice(0,-1) + " within range! (Distance: " + round(dist, 2) + " km)", description, CONFIG.GOOD, url, gmaps)});
                                                                mysql.dailyDMCount("DM", "RAIDRANGE", 1, function(err, reuslt) { if(err) console.log(err); });
                                                            }
                                                          }
                                                      });
                                                  });
                                                }
                                            }
                                        });
                                      }
                                }
                            });
                            console.log("Completed Raid Ranges");
                          }
                          callback();
                      },
                      function(callback) {
                          //Update raids last message id
                          raids_lmi.set(la_raids.lastMessageID);
                          callback();
                      }
                  ]);
              });
          })
      .catch(console.error);
}



//Rares & Pokemon -- Bot Main function
//Read x (source_limit) messages from source_chan
//Parse data
//Log a lot of stuff
//Post back mention code from rares_mentions.json to dest_chan
function run_bot(source_chan, dest_chan, source_lastMessage, source_limit, type) {

    var pokemon_list = loadPokemonsList(); //Not used
    var pokemon_mentions = loadPokemonMentions();
    var perfect_IV_chan = bot.channels.get(CONFIG.PERFECT_IV_CHAN);
    var perfect_LVL_chan = bot.channels.get(CONFIG.PERFECT_LVL_CHAN);
    var trash_IV_chan = bot.channels.get(CONFIG.DITTO_SPAM);
    var bare_rares_chan = bot.channels.get(CONFIG.BARE_RARES_CHAN);
    var TEST_NA = bot.channels.get(CONFIG.TEST_NA);

    //This should ONLY happen on initial run, preventing bot from reading OLD data.
    if (source_lastMessage.get() == "0") source_lastMessage.set(source_chan.lastMessageID);

    //source_lastMessage.set("353539702671933460");

    //Rares Channel
    source_chan.fetchMessages({ limit: source_limit, after: source_lastMessage.get() })
        .then(
            messages => {
                console.log("\n");
                console.log("= " + source_chan.name + " Running...");
                console.log("=== Date: " + new Date().toLocaleString('en-US', { timeZone: 'America/New_York'}));
                console.log(`=== Received ${messages.size} messages`);
                console.log('=== Last Msg ID: ' + source_lastMessage.get());
                console.log('=== Limit: ' + source_limit);

                var message_index = 1;
                var message_count = messages.size;

                messages.forEach(function(message) {
                    console.log("\n");
                    console.log(type +" => " +message_index+"|"+message_count);
                    console.log("MID: "+message.id);

                    //Duplicate message catcher???
                    if(message.id == source_lastMessage.get()) {
                        console.log("DUPLICATE TRIGGER CATCH");
                        return;
                    }


                    var embed = message.embeds[0];                    
                    if(typeof embed == "undefined") {
                        return; //No embed, no valued message.
                    }


                    var url = (typeof message.embeds[0].url != "undefined" ? message.embeds[0].url : "");
                    var coordsString = url.split("=").splice(1);
                    var coords = coordsString[0].split(",");
                    var gmaps = mapUrl(coords[0], coords[1]);   

                    var descriptionText = message.embeds[0].description;
                    var descriptionLines = descriptionText.split("\n");
                    var noIV_Description = descriptionLines[2];

                    console.log(message.embeds[0].title.split(/\s+/g)[0]);
                    console.log(pokemon_mentions[message.embeds[0].title.split(/\s+/g)[0]]);

                    var currentPokemonMention = (typeof pokemon_mentions[message.embeds[0].title.split(/\s+/g)[0]] === 'undefined' ? "" : pokemon_mentions[message.embeds[0].title.split(/\s+/g)[0]]);

                    //console.log(descriptionText);
                    //console.log(noIV_Description);

                    //Set current Pokemon data
                    var currentMon = {}; //Reset to blank
                    currentMon.msgTitle = (typeof message.embeds[0].title != "undefined" ? message.embeds[0].title : "");
                    currentMon.msgDescription = (typeof message.embeds[0].description != "undefined" ? message.embeds[0].description : "");
                    currentMon.noIV_Description = noIV_Description;                                         
                    currentMon.msgUrl = (typeof message.embeds[0].url != "undefined" ? message.embeds[0].url : "");      
                    currentMon.msgImage = (typeof message.embeds[0].image.url != "undefined" ? message.embeds[0].image.url : "");
                    currentMon.msgThumbnail = (typeof message.embeds[0].thumbnail.url != "undefined" ? message.embeds[0].thumbnail.url : "");
                    currentMon.name = (typeof message.embeds[0].title != "undefinded" ? message.embeds[0].title.split(/\s+/g)[0] : "");
                    currentMon.mention = (typeof message.embeds[0].title != "undefined" ? currentPokemonMention : "");
                    currentMon.gmaps = gmaps;                                                                         
                    currentMon.lat = coords[0];                                                                    
                    currentMon.long = coords[1];                                                                 


                    //console.log(JSON.stringify(currentMon));
                    //return;


                    async.series([
                            function(callback) { //DITTA CHECK
                                if(message.author.id == CONFIG.DITTO) {
                                    console.log("Ditto message. Skiping...");
                                    source_lastMessage.set(message.channel.lastMessageID);
                                    console.log(type + " -- LMI "+message.channel.lastMessageID);
                                    message_index++;
                                    return callback('stop');
                                }
                                callback();
                            },
                            function(callback) {
                              //Setter
                              //Map Build


                              callback();
                            },
                            function(callback) { //POST MENTION
                                console.log("Channel: "+type);
                                console.log("Author:  "+message.author.username);
                                console.log("Pokemon: "+currentMon.name);

                                if(currentMon.mention.length > 0) {
                                    //SEND MESSAGE TO CHANNEL
                                    if(CONFIG.TESTING === true) bot.channels.get(CONFIG.TEST_NA).send(currentMon.mention);
                                    else {
                                      dest_chan.send(currentMon.mention);
                                      mysql.dailyDMCount("CHANNEL", type.toUpperCase()+"MENTION", 1, function(err, result) { if(err) console.log(err); });

                                    }
                                    console.log("Sent Mention: (" + currentMon.name + ")" + currentMon.mention + " to " + type);
                                }
                                console.log("Completed Mentions.");
                                callback();
                            },
                            function(callback) { //BARE RARES
                                if(type == 'rares' && CONFIG.RUN_BARE_RARES === true) {
                                    var descriptionText = currentMon.msgDescription;
                                    var descriptionLines = descriptionText.split("\n");
                                    var newDescription = descriptionLines[2];
                                    var bare_rares_chan = bot.channels.get(CONFIG.BARE_RARES_CHAN);
                                    bare_rares_chan.send({embed: richMsg(currentMon.msgTitle, newDescription, CONFIG.GOOD, currentMon.msgUrl, currentMon.gmaps, currentMon.msgThumbnail)});  
                                    console.log("Posted RaresIV entry trimmed to Rares");

                                    if(currentMon.mention.length > 0) {
                                      bare_rares_chan.send(currentMon.mention);
                                    }
                                    console.log("Posted mention to Bare Rares");
                                }                        
                                callback();
                            },
                            function(callback) { //BARE RARES
                                if(type == 'pokemon' && CONFIG.RUN_BARE_POKEMON === true) {
                                    var descriptionText = currentMon.msgDescription;
                                    var descriptionLines = descriptionText.split("\n");
                                    var newDescription = descriptionLines[2];
                                    var bare_pokemon_chan = bot.channels.get(CONFIG.BARE_POKEMON_CHAN);
                                    bare_pokemon_chan.send({embed: richMsg(currentMon.msgTitle, newDescription, CONFIG.GOOD, currentMon.msgUrl, currentMon.gmaps, currentMon.msgThumbnail)});  
                                    console.log("Posted PokemonIV entry trimmed to Pokemon");

                                    if(currentMon.mention.length > 0) {
                                      bare_pokemon_chan.send(currentMon.mention);
                                    }
                                    console.log("Posted mention to Bare Pokemon");
                                }                        
                                callback();
                            },
                            function(callback) { //BARE RARES
                                if(type == 'starters' && CONFIG.RUN_BARE_POKEMON === true) {
                                    var descriptionText = currentMon.msgDescription;
                                    var descriptionLines = descriptionText.split("\n");
                                    var newDescription = descriptionLines[2];
                                    var bare_starters_chan = bot.channels.get(CONFIG.BARE_STARTERS_CHAN);
                                    bare_starters_chan.send({embed: richMsg(currentMon.msgTitle, newDescription, CONFIG.GOOD, currentMon.msgUrl, currentMon.gmaps, currentMon.msgThumbnail)});  
                                    console.log("Posted StartersIV entry trimmed to Starters");

                                    if(currentMon.mention.length > 0) {
                                      bare_starters_chan.send(currentMon.mention);
                                    }
                                    console.log("Posted mention to Bare Starters");
                                }                        
                                callback();
                            },  
                            function(callback) { //PERFECT IV
                                ////////////////////////////
                                // Perfect IV check
                                ////////////////////////////
                                var perfect_reg = new RegExp('15/15/15');
                                var perfect_reg = /15\/15\/15/;                  
                                var perfect_matches = perfect_reg.test(currentMon.msgDescription);                                
                                if(perfect_matches && CONFIG.RUN_PERFECT_IV) { //FOUND PERFECT IV
                                    //Send to perfect channel
                                    var perfect_IV_chan = bot.channels.get(CONFIG.PERFECT_IV_CHAN);
                                    perfect_IV_chan.send(CONFIG.PERFECT_IV + " " +currentMon.name);
                                    perfect_IV_chan.send({embed: richMsg("PERFECT IV " + currentMon.msgTitle, currentMon.msgDescription + " **Donate a Dollar for the Scanner/Ditto by typing !donate in any channel**", CONFIG.GOOD, message.embeds[0].url, gmaps)});                                    
                                    mysql.dailyDMCount("CHANNEL", "PERFECTIVMENTION", 1, function(err, result) { if(err) console.log(err); });
                                }
                                console.log("Completed Perfect IV");
                                callback();
                            },
                            function(callback) { // 97.8%
                                ////////////////////////////
                                // 97.8% check
                                ////////////////////////////                              
                                var IV_check = checkIV(currentMon.msgDescription, 1, "97.8%", "equal"); //Check String "97.8" IV                            
                                if(IV_check && CONFIG.RUN_IV_98) { //FOUND 97.8%
                                    dest_chan.send(CONFIG.IV_98+" "+currentMon.name);                                    
                                }
                                console.log("Completed IV 98");                               
                                callback();   
                            },
                            function(callback) { // 95.6%
                                ////////////////////////////
                                // 95.6% check
                                ////////////////////////////                              
                                var IV_check = checkIV(currentMon.msgDescription, 1, "95.6%", "equal"); //Check String "95.6%" IV                            
                                if(IV_check && CONFIG.RUN_IV_96) { //FOUND 95.6%
                                    dest_chan.send(CONFIG.IV_96+" "+currentMon.name);                                                                 
                                }
                                console.log("Completed IV 96");                               
                                callback();   
                            },
                            function(callback) { //PERFECT LVL
                                ////////////////////////////
                                // Perfect LEVEL check
                                ////////////////////////////
                                var perfect_reg = new RegExp(/LVL: 3\d{1}/, 'g');                    
                                var perfect_matches = perfect_reg.test(currentMon.msgDescription);
                                var IV_check = checkIV(currentMon.msgDescription, 1, 90, "equalbigger"); //Check 70=+ IV 
                                var IV_check100 = checkIV(currentMon.msgDescription, 1, "100%", "equal");

                                if((IV_check || IV_check100) && perfect_matches != false && CONFIG.RUN_PERFECT_LVL) { //FOUND PERFECT LEVEL
                                    var perfect_LVL_chan = bot.channels.get(CONFIG.PERFECT_LVL_CHAN);
                                    perfect_LVL_chan.send(CONFIG.PERFECT_LEVEL + " " + currentMon.name);
                                    perfect_LVL_chan.send({embed: richMsg("MAX LEVEL " + currentMon.msgTitle, currentMon.msgDescription, CONFIG.GOOD, currentMon.msgUrl, currentMon.gmaps)});
                                    mysql.dailyDMCount("CHANNEL", "PERFECTLVLMENTION", 1, function(err, result) { if(err) console.log(err); });
                                }
                                console.log("Completed Perfect LVL");                               
                                callback();   
                            },
                            function(callback) { //TRASH IV
                                ////////////////////////////
                                // TRASH IV check
                                ////////////////////////////
                                var trash_reg = /\(0\/0\/0\)/;                    
                                var trash_matches = trash_reg.test(currentMon.msgDescription);
                                if(trash_matches && CONFIG.RUN_TRASH_IV) { //FOUND PERFECT IV
                                    //Send to perfect channel
                                    var trash_IV_chan = bot.channels.get(CONFIG.DITTO_SPAM);
                                    trash_IV_chan.send(CONFIG.TRASH_IV + " " + currentMon.name);
                                    trash_IV_chan.send({embed: richMsg("TRASH IV " + currentMon.msgTitle, currentMon.msgDescription, CONFIG.GOOD, currentMon.msgUrl, currentMon.gmaps)});
                                    mysql.dailyDMCount("CHANNEL", "TRASHIVMENTION", 1, function(err, result) { if(err) console.log(err); });
                                }
                                console.log("Completed TRASH IV");
                                callback();
                            },                           
                            function(callback) { //RANGE


                                /////////////////////////////
                                // Range Notifications
                                /////////////////////////////
                                if(type == "rares" || type == "pokemon" || type == "starters") {

                                    var url = currentMon.msgUrl;
                                    var coordsString = url.split("=").splice(1);
                                    var coords = coordsString[0].split(",");

                                    //Get users coods
                                    mysql.getActiveRanges(function(err, results) {
                                        if(err) console.log("Error retrieving active ranges.");
                                        else {
                                            if(results.length == 0) {
                                                console.log("0 range entries found!");
                                            }
                                            else { //work
                                                results.forEach(function(result) {



                                                    // Calculate distance between gmaps coords and users coords                                      
                                                    var dist = distance(parseFloat(currentMon.lat), parseFloat(currentMon.long), parseFloat(result.lat), parseFloat(result.lon));

                                                    if(dist < result.ran) {

                                                        var allowedRoles = ["Livemap"];
                                                        var ivRole = false;

                                                        allowedRoles.forEach(function(aRole) {

                                                          if(ivRole === true) return; //If already set to true, do not continue checks

                                                          //Check if user has required roles
                                                          userHasRole(result.userid, aRole, function(hasRole) { ivRole = hasRole; });
                                                        });


                                                        bot.fetchUser(result.userid).then(function(user) { 

                                                            user.createDM().then(function(dm) {

                                                                //Try this, if this doesn't solve it
                                                                // Implement a var holdMessage to prevent overwrite.
                                                                if(type == "rares" && result.rares == 1) { // && onlineStatuses.includes(user.presence.status)
                                                                    console.log("Messaging "+currentMon.name+"("+type+") to "+result.username +" ("+user.presence.status+")");
                                                                    if(CONFIG.RARES_DM) {
                                                                        if(CONFIG.TESTING === true) console.log("DM disabled.");
                                                                        else {
                                                                          dm.send({embed: richMsg(currentMon.name + " within range! (Distance: " + round(dist, 2) + " km)", (ivRole ? currentMon.msgDescription : currentMon.noIV_Description), CONFIG.GOOD, currentMon.msgUrl, currentMon.gmaps)});
                                                                          mysql.dailyDMCount("DM", "RARESRANGE", 1, function(err, result) { if(err) console.log(err); });
                                                                        }
                                                                    }
                                                                }                                                    
                                                                if(type == "pokemon" && result.pokemon == 1) { // && onlineStatuses.includes(user.presence.status)
                                                                    console.log("Messaging "+currentMon.name+"("+type+") to "+result.username +" ("+user.presence.status+")");
                                                                    if(CONFIG.POKEMON_DM) {
                                                                        if(CONFIG.TESTING === true) console.log("DM disabled.");
                                                                        else {
                                                                          dm.send({embed: richMsg(currentMon.name + " within range! (Distance: " + round(dist, 2) + " km)", (ivRole ? currentMon.msgDescription : currentMon.noIV_Description), CONFIG.GOOD, currentMon.msgUrl, currentMon.gmaps)});
                                                                          mysql.dailyDMCount("DM", "POKEMONRANGE", 1, function(err, result) { if(err) console.log(err); });
                                                                        }
                                                                    }
                                                                }
                                                                if(type == "starters" && result.starters == 1) { // && onlineStatuses.includes(user.presence.status)
                                                                    console.log("Messaging "+currentMon.name+"("+type+") to "+result.username +" ("+user.presence.status+")");
                                                                    if(CONFIG.STARTERS_DM) {
                                                                        if(CONFIG.TESTING === true) console.log("DM disabled.");
                                                                        else { 
                                                                          dm.send({embed: richMsg(currentMon.name + " within range! (Distance: " + round(dist, 2) + " km)", (ivRole ? currentMon.msgDescription : currentMon.noIV_Description), CONFIG.GOOD, currentMon.msgUrl, currentMon.gmaps)});
                                                                          mysql.dailyDMCount("DM", "STARTERSRANGE", 1, function(err, result) { if(err) console.log(err); });
                                                                        }
                                                                    }
                                                                }
                                                            });                            
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                                console.log("Completed Range");
                                callback(); // MAIN WORK LOOP
                            },
                            function(callback) { //FINAL STEP
                                //////////////////////////
                                // Final State
                                //////////////////////////
                                console.log("LMI updated + Index updated");
                                console.log("MID: "+message.id);
                                source_lastMessage.set(message.id);
                                message_index++;
                                callback();
                            },
                            function(callback) {
                                source_lastMessage.set(message.channel.lastMessageID);
                                console.log(type + " -- LMI "+message.channel.lastMessageID);
                                callback();
                            },
                            function(callback) {
                               mysql.dailyDMCount("POKEMON", "MENTIONS", 1, function(err, result) { if(err) console.log(err); });
                               callback();
                            }

                        ]);
                });
            })
        .catch(console.error);
}

// lastMessageID - VERY IMPORTANT
//  -- Getter
//  -- Setter
function lastMessageID() {
    var lastMessageID = "0";

    return {
        get: function () { return lastMessageID; },
        set: function (newLastMessageID) { lastMessageID = newLastMessageID; }
    };
}

//Get Pokemon Name by ID (callback)
//NOT USED
function getPokemonByID(pokemon_list, id, callback) {
    callback(pokemon_list[id]);
}

//Get Pokemon Mention by Name (callback)
function getPokemonMention(pokemon_mentions, name, callback) {
    callback(pokemon_mentions[name]);
}

/*
/ Loads pokemon.json
*/
function loadPokemonsList()
{
    return require('./pokemon.json');
}

//Load Pokemon Mentions via Discord Guild Roles
function loadPokemonMentions()
{
    return pokemonMentions.get();
}

//Load Raid Mentions via Discord Guild Roles
function loadRaidMentions()
{
    return raidMentions.get();
}


function getMentionID(mention) {
  return mention.match(/\d+/);
}

//Goal:
//Take server mentions
//Compare them to pokemon in db (pokemonlist)
//Generate pm and rm data
function getGuildMentions(callback) {

  //Return these json chunks
  var pokemonGuildMentions = {};
  var raidGuildMentions = {};
  var notFound = [];
  var data = [];

  //Get Guild Roles
  var guild = bot.guilds.get(CONFIG.GUILD);
  var guildRoles = guild.roles;

  //List of active Pokemon
  var activePokemons = null;

  //Get Active Pokemon List
  mysql.getPokemonActiveEntries(function(err, result) {
    if(err) dlog("Error: mysql.getPokemonActiveEntries failed!");
    else {
      if(result.length > 0) {

        var guildRolesCount = 0;

        //Loop over guild roles
        guildRoles.forEach(function(guildRole) {

          var found = false;
          result.forEach(function(activePokemon) {

              //Pokemon Mentions
              if(capitalizeFirstLetter(guildRole.name) == activePokemon.name) 
              {
                pokemonGuildMentions[capitalizeFirstLetter(guildRole.name.toString())] = "<@&"+guildRole.id+">";
                //console.log("Found Pokemon "+guildRole.name+" with "+guildRole.id);
                found = true;
              }

              //Raid Mentions
              if(capitalizeFirstLetter(guildRole.name) == activePokemon.name+'-r')
              {
                raidGuildMentions[capitalizeFirstLetter(guildRole.name)] = "<@&"+guildRole.id+">";
                //console.log("Found Raid "+guildRole.name+" with "+guildRole.id);
                found = true;
              }

          });

          guildRolesCount++;

          if(!found) 
          {
            if(guildRole.name != "@everyone")
              notFound.push(guildRole.name);
          }

        });

/*        console.log("Parsed "+guildRolesCount);
        console.log("Not Found: "+notFound.join(", "));
        console.log(pokemonGuildMentions);
        console.log(raidGuildMentions);*/

        //Set them
        pokemonMentions.set(pokemonGuildMentions);
        raidMentions.set(raidGuildMentions);

/*        console.log(pokemonMentions.get());
        console.log(raidMentions.get());*/

        //Send data to channel
        data.push("Parsed: "+guildRolesCount+" Roles");
        data.push(" ");
        data.push("Role not found: "+notFound.join(", "));
        callback(data);

      }
      else {
        dlog("Error: Empty list returned for mysqlPokemonActiveEntries!");
      }
    }
  });
}

//Go through livemap users and remove outdated entries
function removeExpiredLivemap() {

  mysql.getExpiredLivemap(function(err, result) {
    if(err) console.log(err);
    else {
        if(result.length > 0) {
          result.forEach(function(livemapUser) {

            //Remove expired entry
            mysql.deleteLivemapEntryByID(livemapUser.ID, function(err, result) {
              if(err) dlog(err);
              else {
                //Check for more entries for that person
                //If there aren't anymore
                // - Message the user that they have expired
                // - Post message to dlog (for Livemap Admin)
                // - Remove livemap role from user
                mysql.showLivemapEntry(livemapUser.userid, function(err, result) {
                  if(err) dlog(err);
                  else {
                    if(result.length == 0) //Found no other entry for user
                    {
                      //Get user
                      bot.fetchUser(livemapUser.userid).then(function(user) {

                          //Post message to dlog (for Livemap Admin)
                          dlog("Removed Livemap DB for "+livemapUser.username);                         

                          //Remove livemap role from user
                          var guild = bot.guilds.get(CONFIG.GUILD);
                          var livemapRole = guild.roles.find("name", "Livemap");
                          guild.fetchMember(user).then(function(member) {
                              //Remove livemap role
                              member.removeRole(livemapRole);
                              //Message user
                              member.send("Your Livemap Role expired and you have been automatically removed. If you have an ongoing subscription, please message Livemap Admin with a screenshot of your continued subscription including the new expiration date.");
                              dlog("Removed Livemap Role from "+livemapUser.username);
                          });
                      });
                    }
                  }
                });
              }
            });
          });
        }
        else {
          dlog("Did not find anybody to remove from Livemap.");
        }
      }
  });
}

//Testing Roles
//Check if message.member has a certain string role.
function messageUserHasRole(message, role) {
  var check_role = message.guild.roles.find("name", role);
  var hasRole = message.member.roles.has(check_role.id);
  return hasRole;
}


//MAIN DISCORD HELPERS
//TRASH? FIX!
function getMember(bot, identifier, callback) {
  var guild = bot.guilds.get(CONFIG.GUILD);

  var gms = guild_members.get();
  console.log(gms);

  console.log(bot.users);

  //Convert string username to userid
  if(isNaN(identifier)) {
    var gottenUser = bot.users.get("name", identifier);
    dlog(gottenUser);
    if(gottenUser != null) identifier = gottenUser.id;
  } 

  dlog("New Identifier: "+identifier);

  bot.fetchUser(identifier).then(function(user) {
    console.log(JSON.stringify(user));
    guild.fetchMember(user).then(function(member) {
      console.log(JSON.stringify(member));
      callback(member);
    });
  });
}

//User by UserID has string role
//User = name
//User = userID
//Role = name
//Role = roleID

//DITTO DEBUGGING
function dlog(message) {
  if(CONFIG.DITTO_DEBUGGING === true) {
    var ditto_debugging_chan = bot.channels.get(CONFIG.DD);
    ditto_debugging_chan.send(message);
  }
}


function userHasRole(user_value, role_value, callback) {

  //dlog("userHasRole: "+ user_value + " " + role_value);

  var guild = bot.guilds.get(CONFIG.GUILD);
  var found = false;

  //Convert string username to userid
  if(isNaN(user_value)) {
    var gottenUser = bot.users.find("username", user_value);
    if(gottenUser != null) user_value = gottenUser.id;
  } 

  //CHECK IF the ROLE exists regardless
  var role = guild.roles.get("name", role_value);
  dlog(role);

  //Fetch user based on id or string name
  bot.fetchUser(user_value).then(function(user) {
    guild.fetchMember(user).then(function(member) {

      //Check if user has the passed role
      var memberRoles = member.roles;
      memberRoles.forEach(function(role) {
        if(role.name == role_value) {
          found = true;
        }
      });
      callback(found);
    })
  }).catch(function(err) {
    dlog("Unable to fetchUser in userHasRole ("+user_value+", "+role+") Error: "+err);
    callback(false);
  });
}


/*
/ Check description for a certain IV+ value (70+)
*/
function checkIV(rawString, elementIndex, value, comparison) {
    var chunks = rawString.split(" ");
    var rawIV = chunks[elementIndex];

    //Equal comparision for '95.6%' -String compare
    if(comparison == "equal") {
      if(rawIV == value) return true;
    }

    //EqualBigger comparison for 70+ -Integer compare
    if(comparison == "equalbigger") {
      var IVchunks = rawIV.split(".");
      var IV = parseInt(IVchunks[0]);
      if(IV >= value) return true;
    }

    return false;
}

//Used for white space removals
function setCharAt(str, index, chr) {
    if (index > str.length - 1) return str;
    return str.substr(0, index) + chr + str.substr(index + 1);
}

function arraySearch(arr, val) {
    for (var i=0; i < arr.length; i++)
        console.log(arr[i]+" <==> "+val);
        if (arr[i] === val)                    
            return i;
    return false;
}

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function objSearch(object, value, debug = false) {
    for (var key in object) {
        if(debug) console.log("Key: "+key);
        if (object.hasOwnProperty(key)) {
            if(debug) console.log("Obj[key]: "+object[key]);
            if(object[key] == value)
                return key;
        }
    }
    return false;
}

function objIndexSearch(object, value, debug = false) {
    for (var key in object) {
        if(debug) console.log("Key: "+key);
        if (object.hasOwnProperty(key)) {            
            if(key == value) {
                if(debug) console.log("Obj[key]: "+object[key]);
                return object[key];                
            }
        }
    }
    return false;  
}

function richMsg(title, description, color, url = null, image = null, thumbnail = null) {
    var richMessage = new Discord.RichEmbed();
    richMessage.setTitle(""+title+"");
    richMessage.setDescription(description);
    richMessage.setColor(color);
    if(url != null) richMessage.setURL(url);
    if(image != null) richMessage.setImage(image);
    if(thumbnail != null) richMessage.setThumbnail(thumbnail);
    return richMessage;
}

function mapUrl(lat, long) {

    var base = "https://maps.googleapis.com/maps/api/staticmap";
    var center = "?center="+lat+","+long;
    var zoom = "&zoom=14";
    var size = "&size=250x180";
    var type = "&maptype=roadmap";
    var marker = "&markers=color:red|"+lat+","+long;
    var key = "&key="+CONFIG.GMAPSKEY;

    return base + center + zoom + size + type + marker + key;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


//Messaging stuff -- not used
bot.on('message', (message) => {

    ////////////////////////////////
    // Command: ?help
    // Command Listing
    if (message.content.startsWith(CONFIG.PREFIX + "help") && CONFIG.HELP) {

        var commands = [];
        commands.push("**Command List**");
        commands.push(CONFIG.PREFIX + "help - This Help Page :P ");
        commands.push(CONFIG.PREFIX + "pm - List - Pokemon Mentions");
        commands.push(CONFIG.PREFIX + "rm - List - Raid Mentions");
        commands.push(CONFIG.PREFIX + "howto - How to add/remove roles");
        commands.push(CONFIG.PREFIX + "myroles - Displays all your current roles");
        commands.push(CONFIG.PREFIX + "change night - Go to night setting (Unown only + saves all mentions).");  
        commands.push(CONFIG.PREFIX + "change day - Go to day setting (Retrieves previously saved night setting).");
        commands.push(CONFIG.PREFIX + "range help - SUB MENU -- GPS Range Feature Help.");
        commands.push(CONFIG.PREFIX + "range examples - GPS Range Feature Examples (pastebin link).");
        commands.push(CONFIG.PREFIX + "gp pokemonname/pokemon# - Populates gamepress link for pokemon.");
        commands.push(CONFIG.PREFOX + "gen # - Display all pokemon listed within the selected generation 1-7.");
        commands.push(CONFIG.PREFIX + "author - Author");
        commands.push("\n");
        commands.push("Questions or dont understand something, but you want to use it? PM me: Nappelinis");
        commands.push("\n");
        commands.push("Like what you see? Donate to my efforts. https://www.paypal.me/Nappelinis/");
        message.channel.send({ embed: richMsg("Ditto - Available commands", commands.join("\n"), CONFIG.GOOD)})
    }


    ////////////////////////////////
    // Command: ?RM
    // Raid Mentions - Command
    if (message.content.startsWith(CONFIG.PREFIX + "rm") && CONFIG.RM) {   
        //OLD JSON
        //var rm = loadRaidMentions();

        //NEW GUILD ROLES
        var rm = raidMentions.get();
        var msg = "**Example:**\nTo add type: **.iam snorlax-r** \nTo remove type: **.iamnot snorlax-r**\n\n";
        for (var key in rm) {
            if (rm.hasOwnProperty(key)) {
                if (rm[key].length > 0) msg += key + ", ";
            }
        }
        msg = msg.slice(0, -2);
        message.channel.send({ embed: richMsg("Raid Mentions List ( "+CONFIG.PREFIX+"rm )", msg, CONFIG.GOOD)})
    }


    ////////////////////////////////
    // Command: ?PM
    //Pokemon Mentions - Command
    if (message.content.startsWith(CONFIG.PREFIX + "pm") && CONFIG.PM) {
       
        //OLD JSON
        //var pm = loadPokemonMentions();

        //NEW GUILD ROLES
        var pm = pokemonMentions.get();
        var msg = "**Example:**\nTo add type: **.iam snorlax** \nTo remove type: **.iamnot snorlax**\n\n";
        for (var key in pm) {
            if (pm.hasOwnProperty(key)) {
                if (pm[key].length > 0) msg += key + ", ";
            }
        }
        msg = msg.slice(0, -2);
        message.channel.send({ embed: richMsg("Pokemon Mentions List ( "+CONFIG.PREFIX+"pm )", msg, CONFIG.GOOD)})
    }

    //Pokemon mention based on database vs discord roles
    if(message.content.startsWith(CONFIG.PREFIX + "updateRoles")) 
    {
      //TODO
      getGuildMentions(function(data) {
        message.channel.send({ embed: richMsg("Ditto Guild Roles", data.join("\n"), CONFIG.GOOD)})
      });
    }


    if(message.content.startsWith(CONFIG.PREFIX + "howto") && CONFIG.HOWTO) {
            var commandspam = bot.channels.get(CONFIG.COMMANDSPAM);
            var howto = [];
            howto.push("**How to**");
            howto.push("\n");
            howto.push("***Add a Role:***");
            howto.push("Type: `.iam ROLE_NAME`");
            howto.push("\n");
            howto.push("***Remove a Role:***");
            howto.push("Type: `.iamnot ROLE_NAME`");
            howto.push("\n");
            howto.push("**Examples:**");
            howto.push("`.iam dratini` -- to add the Dratini role");
            howto.push("`.iam raikou-r` -- to add the Raikou Raid role");
            howto.push("`.iamnot dratini` -- to remove the Dratini role");
            howto.push("`.iamnot raikou-r` -- to remove the Raikou Raid role");
            howto.push("\n");
            howto.push("Checkout `?pm` for **Pokemon Role Names** and `?rm` for **Pokemon Raid Role Names**");
            message.channel.send({embed: richMsg("", howto.join("\n"), CONFIG.GOOD)})
    }

    //Author
    if(message.content.startsWith(CONFIG.PREFIX + "author")) {
        message.channel.send({ embed: richMsg("My master and commander is", "Nappelinis", CONFIG.GOOD)});
    }


    //Role test
    if(message.content.startsWith(CONFIG.PREFIX + "rc")) {
      var args = message.content.split(/\s+/g).slice(1);
      var role = args[0];

      if(messageUserHasRole(message, role))
        message.channel.send("User has "+role);
      else
        message.channel.send("User does not have "+role);
    }

    if(message.content.startsWith(CONFIG.PREFIX + "ur")) {
      var args = message.content.split(/\s+/g).slice(1);
      var user = args[0];
      var role = args[1];
      userHasRole(user, role, function(found) {
        if(found == true) message.channel.send("User "+user+" has "+role);
        if(found == false) message.channel.send("User "+user+" does not have "+role);
      })  
    }



    if (message.content.startsWith(CONFIG.PREFIX + "change") && CONFIG.CHANGE) {
        var args = message.content.split(/\s+/g).slice(1);

        //Change setting
        if(args.length == 1 && isNaN(args[0])) {

            var pm = loadPokemonMentions();
            var rm = loadRaidMentions();

            //Show
            if (args[0] === "show") {
                console.log("Running show");
                //DM person their possible settings
            }

            //Night -switch to night
            if (args[0] === "night") {
                console.log("Running night");
                var save = [];
                var saveName = [];

                //Validate members roles against POKEMON listing
                for (var k in pm) {
                    if (pm.hasOwnProperty(k)) {
                        var mention = pm[k]; //<@&341327116962365441>
                        var mention_id = mention.substring(3, mention.length - 1); //341327116962365441
                        if (message.member.roles.has(mention_id)) {
                            if(mention_id != CONFIG.UNOWN)  {//exclude Unown
                                save.push(mention_id);
                                saveName.push(k);
                            }
                        }                           
                    }
                }

                //Validate members roles against RAID listing
                for (var k in rm) {
                    if (rm.hasOwnProperty(k)) {
                        var mention = rm[k]; //<@&341327116962365441>
                        var mention_id = mention.substring(3, mention.length - 1); //341327116962365441
                        if (message.member.roles.has(mention_id)) {                        
                            if(mention_id != CONFIG.UNOWN)  {//exclude Unown
                                save.push(mention_id);
                                saveName.push(k);
                            }
                        }
                    }
                }


                //Database changes
                mysql.checkChangeStorage("night", message.author.id, function(err, result) {
                    if(err) console.log(err);
                    else {
                        console.log(result);

                        if(result.length > 0)  {//Found entry
                            //Update
                            mysql.updateChangeStorage("night", message.author.username, message.author.id, save.join(), function(err, result) {
                                if(err) {
                                    message.channel.send("Failed to update "+saveName.join()+" for user **"+message.author.username+"**");
                                    console.log(err);
                                }
                                else {
                                    message.channel.send("Stored and removed "+saveName.join()+" for user **"+message.author.username+"**");
                                }
                            });

                        }
                        else {
                            //Insert
                            mysql.insertChangeStorage("night", message.author.username, message.author.id, save.join(), function(err, result) {
                                if(err) {
                                    message.channel.send("Failed to store "+saveName.join()+" for user **"+message.author.username+"**");
                                    console.log(err);
                                }
                                else {
                                    if(result.affectedRows > 0) {
                                        message.channel.send("Stored and removed "+saveName.join()+" for user **"+message.author.username+"**");
                                    }
                                }
                            });
                        }
                    }
                });

                //Remove them
                if(save.length > 0) {
                    message.member.removeRoles(save);
                    console.log("Removed roles for "+message.author.username);
                }
                //DONE with night
            }

            //Day -switch to day
            if (args[0] === "day") {
                console.log("Running day");

                //Get night data for user
                mysql.checkChangeStorage("night", message.author.id, function(err, result) {
                    if(err) {
                        message.channel.send("No data fonud for user "+message.author.username);
                        console.log(err);
                    }
                    else 
                    {
                        var mentions = (result[0].mentions).split(',');

                        //Get names of mentions
                        var pm = loadPokemonMentions();
                        var rm = loadRaidMentions();
                        var restore = [];
                        var name = "";

                        for(var i = 0; i < mentions.length; i++) 
                        {
                            var men = "<@&"+mentions[i]+">";
                            name = objSearch(pm, men);

                            if(name != false)
                                restore.push(name);
                        }

                        for(var i = 0; i < mentions.length; i++) 
                        {
                            var men = "<@&"+mentions[i]+">";
                            name = objSearch(rm, men);
                            if(name != false)
                                restore.push(name);
                        }

                        console.log(restore);

                        console.log(mentions);
                        if(mentions.length > 0) {
                            message.member.addRoles(mentions);
                            message.channel.send("Restored "+restore.join()+" for **"+message.author.username+"**");
                        }
                    }
                });
            }
        }
    }

    //Range work
    if(message.content.startsWith(CONFIG.PREFIX + "range") && CONFIG.RANGE) {
        var args = message.content.split(/\s+/g).slice(1);
        var command = args.shift();
        console.log(args);

        switch(command) {
            case "examples":
                message.author.send({embed: richMsg("", "https://pastebin.com/embed_iframe/akWjEWi6", CONFIG.GOOD)});
                break;
            case "help":
                var rangeList = [];
                rangeList.push("**DISCLAIMER:**");
                rangeList.push("  **THE FOLLOWING COMMANDS WILL DIRECT MESSAGE YOU.**");
                rangeList.push("  **PREVENT OTHERS FROM SEEING YOUR SENSITIVE DATA.**");
                rangeList.push("  **DO NOT DISCLOSE YOUR GPS LOCATION TO ANYBODY (IT\'S LIKELY YOUR HOME).**");
                rangeList.push("  **AUTHOR IS NOT RESPONSIBLE FOR YOU ACTIONS.**");
                rangeList.push("\n");
                rangeList.push("**What does this do? How does it do it?**");
                rangeList.push("Range feature will message you directly when a 'Rare' spawn has been found in your selected range.");
                rangeList.push("It does this by calulating the distance between your given GPS coords and the GPS coords of the 'Rare' Pokemon.");
                rangeList.push("If the distance is within your defined range, you will receive a message that a 'Rare' Pokemon is near by.");
                // Part 1
                message.author.send({embed: richMsg("", rangeList.join("\n"), CONFIG.GOOD)});
                

                rangeList = [];
                rangeList.push("**"+CONFIG.PREFIX+"range help** -- This help message.");
                rangeList.push("**"+CONFIG.PREFIX+"range gps** -- Defines GPS coordinates for the user initiating the request.");
                rangeList.push("    Requires 3 arguments: Latitude, Longitude, Range (in km).");
                rangeList.push("    **Example:** "+CONFIG.PREFIX+"range gps 42.7325 -84.5555 5");
                rangeList.push("\n");
                rangeList.push("**"+CONFIG.PREFIX+"range show** -- Displays your data.");
                rangeList.push("**"+CONFIG.PREFIX+"range on** -- Activates your range notifications. (DEFAULT)");
                rangeList.push("**"+CONFIG.PREFIX+"range off** -- Deactivates your range notifications.");
                rangeList.push("**"+CONFIG.PREFIX+"range set X** -- Where X is a floating point number (xx.y) From 0 to 20. Example: 1.7 means 1.7km");
                rangeList.push("**"+CONFIG.PREFIX+"range delete** -- Deletes any and all entries of your ranges.");
                // Part 2
                message.author.send({embed: richMsg("", rangeList.join("\n"), CONFIG.GOOD)});

                rangeList = [];
                rangeList.push("**Range Flags:**");
                rangeList.push("**"+CONFIG.PREFIX+"range rares on|off** -- Turn <#"+CONFIG.RARES_CHAN+"> range notifications on/off.");
                rangeList.push("**"+CONFIG.PREFIX+"range pokemon on|off** -- Turn <#"+CONFIG.POKEMON_CHAN+"> range notifications on/off.");
                rangeList.push("**"+CONFIG.PREFIX+"range starters on|off** -- Turn <#"+CONFIG.STARTERS_CHAN+"> range notifications on/off.");
                rangeList.push("**"+CONFIG.PREFIX+"range raids on|off** -- Turn raid channels range notifications on/off.");
                rangeList.push("**"+CONFIG.PREFIX+"range raidlevels 1,2,3,4,5** -- Example: "+CONFIG.PREFIX+"range raidlevels 1,4,5 for raids Level: 1, 4 and 5");
                rangeList.push("\n");
                //rangeList.push("****");
                //rangeList.push("**"+CONFIG.PREFIX+"range mentions on|off** -- Turn mentions on/off. Whether to obey your current set mentions(on) or ignore them(off). [NOT IMPLEMENTED]");
                // Part 3
                message.author.send({embed: richMsg("", rangeList.join("\n"), CONFIG.GOOD)});

                rangeList = [];
                rangeList.push("**How to find your GPS coordinates?** https://www.maps.ie/coordinates.html");
                rangeList.push("\n");
                rangeList.push("**FAQs**");
                rangeList.push("**Q:** Can I setup multiple locations? **A:** No.");
                rangeList.push("**Q:** Do I need to place 'commas' between the arguments of "+CONFIG.PREFIX+"range gps? **A:** No commas. GPS needs dots i.e: 42.1234 -84.1234");
                rangeList.push("**Q:** What will I get notification for? **A:** Any 'RARE' scanned in #rares, if within your locations range.");
                rangeList.push("**Q:** Do I need to setup mentions for this? **A:** No mentions are required (currently).");
                // Part 4
                message.author.send({ embed: richMsg("", rangeList.join("\n"), CONFIG.GOOD) });

                break;
            case "on":
                //Turn service on for user
                //Check if user has entry!
                mysql.getUserRange(message.author.id, function(err, result) {
                    if(err) {
                        message.author.send({embed: richMsg("", "Issue loading user data. Reasons could be: You do not have an entry yet. Check "+CONFIG.PREFIX+"range show.", CONFIG.ERROR)});
                        console.log(err);
                    }
                    else 
                    {
                        mysql.updateRangeStatus(message.author.id, "main", 1, function(err, result){
                            if(err) {
                                message.author.send({embed: richMsg("", "Failed to update status to Active.", CONFIG.ERROR)});
                                console.log(err);
                            }
                            else {
                                message.author.send({embed: richMsg("", "Updated Status to Active.", CONFIG.GOOD)});
                            }
                        });
                    }
                });
                break;
            case "off":
                //Turn service off for user
                //Check if user has entry!
                mysql.getUserRange(message.author.id, function(err, result) {
                    if(err) {
                        message.author.send({embed: richMsg("", "Issue loading user data. Reasons could be: You do not have an entry yet. Check "+CONFIG.PREFIX+"range show.", CONFIG.ERROR)});
                        console.log(err);
                    }
                    else 
                    {
                        mysql.updateRangeStatus(message.author.id, "main", 0, function(err, result){
                            if(err) {
                                message.author.send({embed: richMsg("", "Failed to update status to Inactive.", CONFIG.ERROR)});
                                console.log(err);
                            }
                            else {
                                message.author.send({embed: richMsg("", "Updated Status to Inactive.", CONFIG.GOOD)});
                            }

                        });
                    }
                });
                break;
            case "rares":
            case "pokemon":
            case "starters":
            case "raids":
            case "mentions":
                     //Turn service off for user
                    //Check if user has entry!
                    mysql.getUserRange(message.author.id, function(err, result) {
                        if(err) {
                            message.author.send({embed: richMsg("", "Issue loading user data. Reasons could be: You do not have an entry yet. Check "+CONFIG.PREFIX+"range show.", CONFIG.ERROR)});
                            console.log(err);
                        }
                        else 
                        {
                            mysql.updateRangeType(message.author.id, "main", command, (args[0] == "on" ? 1 : 0), function(err, result){
                                if(err) {
                                    message.author.send({embed: richMsg("", "Failed to update "+command+" to "+args[0]+".", CONFIG.ERROR)});
                                    console.log(err);
                                }
                                else {
                                    message.author.send({embed: richMsg("", "Updated "+command+" to "+args[0]+".", CONFIG.GOOD)});
                                }

                            });
                        }
                    });
                break;
            case "raidlevels":
                var raw_raidlevels = args[0];
                var validate_raid_levels = raw_raidlevels.split(',');

                var valid = true;
                var valid_levels = [1,2,3,4,5];
                validate_raid_levels.forEach(function(raid_level) {
                  console.log(raid_level);
                  if(typeof parseInt(raid_level) != "number" || valid_levels.indexOf(parseInt(raid_level)) == -1) {
                      valid = false;
                  }
                });

                if(valid) { //Valid enter into DB
                     mysql.getUserRange(message.author.id, function(err, result) {
                        if(err) {
                            message.author.send({embed: richMsg("", "Issue loading user data. Reasons could be: You do not have an entry yet. Check "+CONFIG.PREFIX+"range show.", CONFIG.ERROR)});
                            console.log(err);
                        }
                        else 
                        {
                          mysql.updateRaidLevels(message.author.id, raw_raidlevels, function(error, result) {
                            if(err) {
                              message.author.send({embed: richMsg("", "Unable to update raid levels.", CONFIG.ERROR)});
                            }
                            else {
                              message.author.send({embed: richMsg("", "Updated raid levels to "+raw_raidlevels, CONFIG.GOOD)});
                            }
                          });
                        }
                    });
                }
                else { //Found invalid element in raid levels supplied
                  message.author.send({embed: richMsg("", "Invalid raid level submission: "+raw_raidlevels+" Example 1: 1,2,3,4,5 for all.", CONFIG.ERROR)});
                }
                break;
            case "set":

                //Validate
                var newRange = parseFloat(args[0]);
                var errorMessage = [];
                if(isNaN(newRange)) errorMessage.push("Need to be a floating point number. Example: "+CONFIG.PREFIX+"range set 5");
                if(!isNaN(newRange) && (newRange > 20 || newRange < 0)) errorMessage.push("Max Range: 20km. Example: "+CONFIG.PREFIX+"range set 20");

                //Fix length
                newRange = newRange.toFixed(1);

                if(errorMessage.length > 0) {
                    message.author.send({embed: richMsg("", errorMessage.join("\n"), CONFIG.ERROR)});
                }
                else {
                    //Set range distance for user
                    //Check if user has entry!
                    mysql.getUserRange(message.author.id, function(err, result) {
                        if(err) {
                            message.author.send({embed: richMsg("", "Issue loading user data. Reasons could be: You do not have an entry yet. Check "+CONFIG.PREFIX+"range show.", CONFIG.ERROR)});
                            console.log(err);
                        }
                        else 
                        {
                            //Update range
                            mysql.updateRangeRange(message.author.id, "main", newRange, function(err, result){
                                if(err) {
                                    message.author.send({embed: richMsg("", "Failed to update Range.", CONFIG.ERROR)});
                                    console.log(err);
                                }
                                else {
                                    message.author.send({embed: richMsg("", "Updated Range to " + newRange +"km", CONFIG.GOOD)});
                                }
                            });
                        }
                    });
                }


                break;
            case "delete":
                mysql.deleteRange(message.author.id, function(err, result) {
                    if(err) {
                        message.author.send({embed: richMsg("", "Failed to delete entry.", CONFIG.ERROR)});
                        console.log(err);
                    }
                    else {
                        message.author.send({embed: richMsg("", "Your data has been erased.", CONFIG.GOOD)});
                    }
                });
                break;
            case "show":
                //Show user settings
                mysql.getUserRange(message.author.id, function(err, result) {
                    if(err) {
                        message.author.send({embed: richMsg("", "Error loading " + message.author.username, CONFIG.ERROR)});
                        console.log(err);
                    }
                    else 
                    {

                        if(result.length == 0) message.author.send({embed: richMsg("", "No entry found for "+ message.author.username, CONFIG.ERROR)});
                        else {
                            var userData = [];
                            var notImplemented = " (not implemented yet)";
                            userData.push("**Username:** "+result[0].username);
                            userData.push("**Latitude:** "+result[0].lat);
                            userData.push("**Longitude:** "+result[0].lon);
                            userData.push("**Range:** "+result[0].ran+"km");
                            userData.push("**Status:** "+(result[0].active ? "ON" : " OFF"));
                            userData.push("\n");
                            userData.push("**--Selections--**");
                            userData.push("**Rares:**"+(result[0].rares ? " ON" : " OFF"));
                            userData.push("**Pokemon:**"+(result[0].pokemon ? " ON" : " OFF"));
                            userData.push("**Starters:**"+(result[0].starters ? " ON" : " OFF"));
                            userData.push("**Raids:**"+(result[0].raids ? " ON" : " OFF"));
                            userData.push("**Raid Levels:** "+result[0].raid_levels);
                            userData.push("**Mentions:**"+(result[0].mentions ? " ON" : " OFF"));
                            message.author.send({embed: richMsg("", userData.join('\n'), CONFIG.GOOD)});
                        }
                    }
                });
                break;
            case "gps":

                var maxLimit = 1;
                var count = lastMessageID();

                mysql.getUserRange(message.author.id, function(err, result) {
                    if(err) message.author.send({embed: richMsg("", "Unable to retrieve user range (gps call)", CONFIG.ERROR)});
                    else {
                        if(result.length > 0) {
                            message.author.send({embed: richMsg("", "You already have a GPS point set. Current limit: 1", CONFIG.ERROR)});
                            count.set(1);
                        }
                        else 
                        {
                            //Set user gps coords
                            if(args.length == 3) { //lat, long, range
                                var lat = parseFloat(args[0]);
                                var long = parseFloat(args[1]);
                                var range = parseInt(args[2]);

                                var errorMessage = [];

                                // console.log(typeof lat);
                                // console.log(typeof long);
                                // console.log(typeof range);

                                //Validate
                                var latlongpattern = /^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,6}/;
                                if(!latlongpattern.test(lat)) errorMessage.push("Invalid Latitude");
                                if(!latlongpattern.test(long)) errorMessage.push("Invalid Longitude");           
                                if(range % 1 != 0)  errorMessage.push("Invalid Range, need to be whole number (integer)");
                                if(range > 20) errorMessage.push("Range cannot exceed 20km");

                                if(errorMessage.length > 0) { //Some error encountered
                                    errorMessage.unshift("Errors detected during ?range gps call");
                                    message.author.send({embed: richMsg("", errorMessage.join("\n"), CONFIG.ERROR)});
                                }
                                else { //Do work
                                    console.log("Adding GPS coords for user");
                                    var name = "main";
                                    var active = 1;

                                    // console.log(message.author.username);
                                    // console.log(message.author.id);
                                    // console.log(name);
                                    // console.log(range);
                                    // console.log(lat);
                                    // console.log(long);
                                    // console.log(active);

                                    mysql.createRangeEntry(message.author.username, message.author.id, name, range, lat, long, active, function(err, result) {
                                        if(err) {
                                            message.author.send({embed: richMsg("", "Issue saving GPS data.", CONFIG.ERROR)});
                                            console.log(err);
                                        }
                                        else 
                                        {
                                            message.author.send({embed: richMsg("", "Added GPS -- Lat: " + lat + " Long: " + long + " with range set to " + range + " km.", CONFIG.GOOD)});
                                        }
                                    });
                                }

                            }
                            else {
                                message.author.send({embed: richMsg("", "**"+CONFIG.PREFIX+"range gps** - requires **3** arguments (latitude, longitude, # range (km)\n**Example:** "+CONFIG.PREFIX+"range gps 42.1234 -84.1234 5", CONFIG.WARNING)});
                            }
                        }
                    }
                });
                break;
            default:
                message.author.send({embed: richMsg("", "Unknown "+CONFIG.PREFIX+"range '"+command+"' call! Type: "+CONFIG.PREFIX+"range help", CONFIG.WARNING)});
                break;
        }

        setTimeout(function() {
            message.delete();
        }, 300);

    }




    // if(message.content.startsWith(CONFIG.PREFIX+"READ")) {
    //     message.channel.send("READ??");

    //     var CHANNEL = bot.channels.get(CONFIG.PERFECT_LVL_CHAN);

    //      CHANNEL.fetchMessage('364520089917063199')
    //           .then(message => {
    //               var desc = message.embeds[0].description;
    //               console.log(checkIV(desc, 1, 70));

    //           })
    //           .catch(console.error);

    // }

    //Ditto Stats
    if(message.content.startsWith(CONFIG.PREFIX+"stats")) {

        console.log("STATS");
        var stats = [];
        mysql.usageCountDayNight(function(err, result) {
            if(!err) { stats.push("Day/Night Total: "+result[0].count); console.log(result[0].count); }
            else { console.log(err); }
        });
        mysql.usageCountRange(function(err, result) {
            if(!err) { stats.push("Range Total: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });
        mysql.usageActiveCountRange(function(err, result) {
            if(!err) { stats.push("Range Active: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });
        mysql.usageRaresCountRange(function(err, result) {
            if(!err) { stats.push("Range Rares: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });
        mysql.usagePokemonCountRange(function(err, result) {
            if(!err) { stats.push("Range Pokemon: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });
        mysql.usageStartersCountRange(function(err, result) {
            if(!err) { stats.push("Range Starters: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });   
        mysql.usageRaidCountRange(function(err, result) {
            if(!err) { stats.push("Range Raid: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });
        mysql.usageMentionsCountRange(function(err, result) {
            if(!err) { stats.push("Range Mentions: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });
        mysql.usageDistanceCountRange(1, function(err, result) {
            if(!err) { stats.push("Range Distance 1km: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });
        mysql.usageDistanceCountRange(2, function(err, result) {
            if(!err) { stats.push("Range Distance 2km: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });
        mysql.usageDistanceCountRange(3, function(err, result) {
            if(!err) { stats.push("Range Distance 3km: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        }); 
        mysql.usageDistanceCountRange(4, function(err, result) {
            if(!err) { stats.push("Range Distance 4km: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        }); 
        mysql.usageDistanceCountRange(5, function(err, result) {
            if(!err) { stats.push("Range Distance 5km: "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });   
        mysql.usageDistanceCountRange(20, function(err, result) {
            if(!err) { stats.push("Range Distance 20km(REALLY?): "+result[0].count);  console.log(result[0].count); }
            else { console.log(err); }
        });                               

        setTimeout(function() {
          message.channel.send({embed: richMsg("Ditto Stats", stats.join("\n"), CONFIG.GOOD)});
        },2000);
        
    }


    //.iam CONFIG.SPECIAL_NAME
    var name = CONFIG.SPECIAL_NAME;
    if(message.content == ".iam "+name) {
        bot.fetchUser(message.author.id).then(function(user) {
            console.log(user.username);
            if(user.username != name) message.channel.send({embed: richMsg("", "Nice try, but you are not "+name, CONFIG.ERROR)})
            else message.channel.send({embed: richMsg("", "There can only be one **"+name+"**, you are it!", CONFIG.GOOD)})
        });
    }


    //MyRoles
    if(message.content.startsWith(CONFIG.PREFIX+"myroles")) {
        var member_roles = message.member.roles;
        var roles = [];
        member_roles.forEach(function(role) { 
            roles.push(role.name);
        });
        message.channel.send({embed: richMsg(message.author.username, roles.join(", "), CONFIG.GOOD)});
    }

    //

    //Passive aggressiveness
    if(message.content.startsWith(CONFIG.PREFIX+"google")) {
      message.channel.send({embed: richMsg("HALP ME!", "http://lmgtfy.com/?iie=1&q=http://www.google.com", CONFIG.GOOD)});
    }



    //Live map


    //Alive/Prune testing
    //Unfinished
    if(message.content.startsWith(CONFIG.PREFIX+"check")) {
        let args = message.content.split(/\s+/g).slice(1);
        let SEARCH_ROLE = message.guild.roles.find("name", args[0]);
        let SERVER_ADMIN = message.guild.roles.find("name", "Admin");
        let BOT_MASTER = message.guild.roles.find("name", "bot master");

        if((message.member.roles.has(SERVER_ADMIN.id) || message.member.roles.has(BOT_MASTER.id)) && SEARCH_ROLE != null) {
            var guild = bot.guilds.get(CONFIG.GUILD);
            var members = guild.members;

            var count = 0;
            var member_list_with_role = [];
            members.forEach(function(member) {
                if(member.roles.has(SEARCH_ROLE.id)) {
                    count++;
                    //console.log(member);
                }
            });
            message.channel.send({embed: richMsg("", "Role: `"+args[0]+"` "+count + "/" + guild.memberCount , CONFIG.INFO)});

        }
        else if((message.member.roles.has(SERVER_ADMIN.id) || message.member.roles.has(BOT_MASTER.id)) && SEARCH_ROLE == null) {
            message.channel.send("Unknown role search");
        }
        else {
            message.channel.send("ADMIN ONLY COMMAND!");
        }
    }



    if(message.content.startsWith(CONFIG.PREFIX+"validate")) {

        var deadMemberNames = [];
        var deadMemberIDS = [];

        var guild = bot.guilds.get(CONFIG.GUILD);

        let args = message.content.split(/\s+/g).slice(1);
        let TABLE = args[0];
        //let SEARCH_ROLES = message.guild.roles.find("name", args[1]);
        let SERVER_ADMIN = message.guild.roles.find("name", "Admin");
        let BOT_MASTER = message.guild.roles.find("name", "bot master");
        let INSTINCT = guild.roles.find("name", "Instinct");
        let MYSTIC = guild.roles.find("name", "Mystic");
        let VALOR = guild.roles.find("name", "Valor");

        if(message.member.roles.has(SERVER_ADMIN.id) || message.member.roles.has(BOT_MASTER.id)) {
          if(TABLE == "change") {
              console.log("VALIDATE CHANGE");
              mysql.allChangeUsers(function(err, result) {
                result.forEach(function(resultuser) {
                      bot.fetchUser(resultuser.userid).then(function(user) {
                          guild.fetchMember(user).then(function(guildUser) {

                              var hasNeededRole = false;
                              var memberRoles = guildUser.roles;
                              memberRoles.forEach(function(role) {
                                if(role.name == "Instinct") { hasNeededRole = true; return; }
                                if(role.name == "Mystic") { hasNeededRole = true; return; }
                                if(role.name == "Valor") { hasNeededRole = true; return; }
                              });

                              if(!hasNeededRole) { 
                                console.log("No Team Role: "+resultuser.username);
                                mysql.removeDeadChangeUser(resultuser.userid, function(err, result) {
                                  if(err) console.log(err);
                                  else {
                                      var msg = "Removed changeStorage entry for " + resultuser.username;
                                      console.log(msg);
                                      message.channel.send(msg);
                                  }                                
                                });
                              }

                          }).catch(function(err) {
                              //console.log(err);
                              //console.log(err.message);
                              if(err.message === 'Unknown Member') {
                                  console.log("Dead Member: "+resultuser.username);
                                  mysql.removeDeadChangeUser(resultuser.userid, function(err, result) {
                                    if(err) console.log(err);
                                    else {
                                      var msg = "Removed changeStorage entry for " + resultuser.username;
                                      console.log(msg);
                                      message.channel.send(msg);
                                    }
                                  });
                              }
                          });
                      });
                  });  
              });
              console.log("VALIDATE RANGE COMPLETED");
          }
          else if(TABLE == "range") {
              console.log("VALIDATE RANGE");
              mysql.allRangeUsers(function(err, result) {
                 result.forEach(function(resultuser) {
                      bot.fetchUser(resultuser.userid).then(function(user) {
                          guild.fetchMember(user).then(function(guildUser) {

                              var hasNeededRole = false;
                              var memberRoles = guildUser.roles;
                              memberRoles.forEach(function(role) {
                                if(role.name == "Instinct") { hasNeededRole = true; return; }
                                if(role.name == "Mystic") { hasNeededRole = true; return; }
                                if(role.name == "Valor") { hasNeededRole = true; return; }
                              });

                              if(!hasNeededRole) {
                                  console.log("No Team Role: "+resultuser.username);
                                  mysql.removeDeadRangeUser(resultuser.userid, function(err, result) {
                                    if(err) console.log(err);
                                    else {
                                      var msg = "Removed range entry for " + resultuser.username;
                                      console.log(msg);
                                      message.channel.send(msg);
                                    }
                                  });
                              }

                          }).catch(function(err) {
                              //console.log(err);
                              //console.log(err.message);
                              if(err.message === 'Unknown Member') {
                                  console.log("Dead Member: "+resultuser.username);
                                  mysql.removeDeadRangeUser(resultuser.userid, function(err, result) {
                                    if(err) console.log(err);
                                    else {
                                        var msg = "Removed range entry for " + resultuser.username;
                                        console.log(msg);
                                        message.channel.send(msg);
                                    }
                                  });
                              }
                          });
                      });
                  });
              });
              console.log("VALIDATE RANGE COMPLETED");
          }
          else {
            message.channel.send("Unknown validation.");
          }
        }
        else {
          message.channel.send("ADMIN ONLY COMMAND!");
        }

        // mysql.usageDistanceCountRange(5, function(err, result) {


    }


    //Gamepress display
    if(message.content.startsWith(CONFIG.PREFIX+"gp")) {
      var args = message.content.split(/\s+/g).slice(1);
      var baseURL = "https://pokemongo.gamepress.gg/pokemon/";
      if(isNaN(args[0])) { //String
        //Check if exists
        //Look up ID of pokemon
        mysql.getPokemonByName(args[0], function(err, result) {
          if(err) console.log(err);
          else {
            message.channel.send(baseURL+result[0].pid);
          }
        });
      }
      else {
        //Send url with ID
        message.channel.send(baseURL+args[0]);
      }
    }


    //Generation display
    if(message.content.startsWith(CONFIG.PREFIX+"gen")) {
      var args = message.content.split(/\s+/g).slice(1);
      if(isNaN(args[0])) {
        message.channel.send("Generation argument needs to be numerical.");
      }
      else {
        if(args[0] > 7) {
          message.channel.send("Max generation 7.");
        }
        else {
          mysql.getPokemonGeneration(args[0], function(err, result) {
            if(err) console.log(err);
            else {
              var generationString = "";
              result.forEach(function(pokemonEntry) {
                generationString += pokemonEntry.name+", ";
              });
              message.channel.send("**Generation "+args[0]+":** "+generationString);
            }
          });
        }
      }
    }


    //Toledo
    if(message.content.startsWith(CONFIG.PREFIX+"livemap")) {
      var args = message.content.split(/\s+/g).slice(1);

      var action = args.shift(1);

      let SERVER_ADMIN = message.guild.roles.find("name", "Admin");
      let BOT_MASTER = message.guild.roles.find("name", "bot master");
      let LIVEMAP_ADMIN = message.guild.roles.find("name", "Livemap Admin");


      var prices = {"contest": 0, "forever": 0, "3days": 1.99, "3daysVIP": 2.99, "14days": 2.99, "14daysVIP": 5.99, "1month": 4.99, "1month-non-recurring": 4.99, "1monthVIP": 10, "1month-non-recurringVIP": 10, "1monthplus": 10.00, "1monthplus-non-recurring": 10.00}; //Last two are grandfather old (DB entries)

      if(message.member.roles.has(SERVER_ADMIN.id) || message.member.roles.has(BOT_MASTER.id) || message.member.roles.has(LIVEMAP_ADMIN.id)) {
        
        mysql.toledoData(function(err, toledoData) {
          if(err) console.log(err);
          else {
              switch(action) {

                  case "help":
                      var livemapHelp = [];
                      livemapHelp.push(CONFIG.PREFIX+"livemap help - Help Menu");
                      livemapHelp.push(CONFIG.PREFIX+"livemap show - Show Livemap User entry. Example: "+CONFIG.PREFIX+"show username");
                      livemapHelp.push(CONFIG.PREFIX+"livemap total - Total active current value.");
                      livemapHelp.push(CONFIG.PREFIX+"livemap data - Current active data dump.");
                      livemapHelp.push(CONFIG.PREFIX+"livemap add - Add New Livemap User. Example: "+CONFIG.PREFIX+"add username type expires (Format: YYYY-MM-DD)");
                      livemapHelp.push(CONFIG.PREFIX+"livemap delete - Delete Livemap User. Example: "+CONFIG.PREFIX+"delete username.");
                      livemapHelp.push(CONFIG.PREFIX+"livemap options - Type and Price option listing.");
                      message.channel.send({embed: richMsg("Help - Livemap", livemapHelp.join("\n"), CONFIG.GOOD)});
                      break;

                  case "total": //Total active current value
                      var sum = 0;
                      toledoData.forEach(function(item) {
                        sum += prices[item.type];
                      });
                      
                      message.channel.send("Toledo Ohio Sum: "+sum.toFixed(2)+"\n"+"(Based on currently active subscriptions)");              
                      break;

                  case "data": //Total active data dump
                      var displayData = [];
                      toledoData.forEach(function(item) {
                        displayData.push(item.username+"    **"+item.type+ " ("+prices[item.type]+")**    "+new Date(item.expires).toLocaleDateString());
                      });
                      message.channel.send(displayData.join("\n"));
                      break;

                  case "show": //Show Livemap user data
                      var userMention = args[0];
                      var userid = getMentionID(userMention);
                      bot.fetchUser(userid).then(function(user) {
                        mysql.showLivemapEntry(user.id, function(err, userRow) {
                          if(err) { 
                              message.channel.send({embed: richMsg("Show - Livemap User Entry", "Unable to obtain entry for "+user.username+" ErrorCode(1)", CONFIG.ERROR)});
                            }
                          else {
                              if(userRow.length > 0) {
                                var displayData = [];
                                displayData.push("Username: "+userRow[0].username);
                                displayData.push("UserID: "+userRow[0].userid);
                                displayData.push("Type: "+userRow[0].type);
                                displayData.push("Expires: "+userRow[0].expires);
                                message.channel.send({embed: richMsg("Show - Livemap User Entry", displayData.join("\n"), CONFIG.GOOD)});
                              }
                              else {
                                message.channel.send({embed: richMsg("Show - Livemap User Entry", "No entry found for "+user.username+" ErrorCode(2)", CONFIG.ERROR)});
                              }
                          }
                        });       
                      });
                      break;
                  case "add": //Add Livemap user data : username type expires
                      var userMention = args[0]; //User Mention: @Sheep
                      var type = args[1];
                      var expires = args[2];

                      var userid = getMentionID(userMention);
                      var guild = bot.guilds.get(CONFIG.GUILD);
                      bot.fetchUser(userid).then(function(user) { 
                        if(userid.length > 0 && type.length > 0 && expires.length > 0) {
                            
                            //Delete old entries
                            mysql.deleteLivemapEntry(userid, function(err, result) {
                              if(err) { dlog(err); }
                            });                     

                            //Add new Entry
                            mysql.addLivemapEntry(user.username, user.id, type, new Date(expires+" 23:59:59"), function(err, result) {
                              if(err) dlog(err);
                              else {
                                message.channel.send("Livemap User added " + user.username + " for " + type + " which expires " + expires); 
                              }
                            });

                            //Add Livemap role
                            var guild = bot.guilds.get(CONFIG.GUILD);
                            var livemapRole = guild.roles.find("name", "Livemap");
                            guild.fetchMember(user).then(function(member) {
                              member.addRole(livemapRole);
                              message.channel.send("Added Livemap role to "+member.user.username);
                            });
                        }
                      }).catch(function(error) {
                        dlog("Livemap add error " + userid + "  " + userMention + " " + error)
                      });
                      break;            
                  case "delete":
                      var userMention = args[0];
                      var userid = getMentionID(userMention);

                      bot.fetchUser(userid).then(function(user) {
                        //Delete entries
                        mysql.deleteLivemapEntry(userid, function(err, result) {
                          if(err) console.log(err);
                          else {
                            message.channel.send({embed: richMsg("Delete - Livemap User Entry", "User " + user.username+ " deleted!", CONFIG.GOOD)});
                          }
                        });

                        //Delete role
                        var guild = bot.guilds.get(CONFIG.GUILD);
                        var livemapRole = guild.roles.find("name", "Livemap");

                        guild.fetchMember(user).then(function(member) {
                          member.removeRole(livemapRole);
                          message.channel.send("Removed Livemap role from user "+user.username);
                        });
                      });
                      break;
                  case "options": //Display livemap price optiosn and types
                      var displayData = [];

                      for(var i in prices){
                          displayData.push("Option: "+i+"  Price: "+prices[i]);
                      }
                      message.channel.send({embed: richMsg("Type Options and Prices:", displayData.join("\n"), CONFIG.GOODD)});
                      break;
              }
          }
        });
      }
      else {
        message.channel.send("ADMIN ONLY COMMAND");
      }
    }

    //Mention controller
    if(message.content.startsWith(CONFIG.PREFIX+"mention")) {
      var args = message.content.split(/\s+/g).slice(1);
      var action = args.shift(1);

      let SERVER_ADMIN = message.guild.roles.find("name", "Admin");
      let BOT_MASTER = message.guild.roles.find("name", "bot master");

      if(message.member.roles.has(SERVER_ADMIN.id) || message.member.roles.has(BOT_MASTER.id)) {

        //Display mention help menu
        if(action == "help") {
          var mentionHelp = [];
          mentionHelp.push(CONFIG.PREFIX+"mention showall");
          mentionHelp.push(CONFIG.PREFIX+"mention add name type mentionCode Example: "+CONFIG.PREFIX+"mention add Ivysaur pokemon/raid <@&mentioncode>");
          mentionHelp.push(CONFIG.PREFIX+"mention show name Example: "+CONFIG.PREFIX+"mention show Ivysaur");
          mentionHelp.push(CONFIG.PREFIX+"mention remove name Example: "+CONFIG.PREFIX+"mention remove Ivysaur");
          message.channel.send({embed: richMsg("", mentionHelp.join("\n"), CONFIG.GOOD)});
        }


        //Display all mentions that currently exist
        if(action == "showall") {
          var mentions = [];
          mysql.getAllPokemonMentions(function(err, mention_results) {
            if(err) console.log(err);
            else {
              mention_results.forEach(function(mention_item) {
                mentions.push(mention_item.mention+" "+mention_item.pname);
              });

              //Deal with long message above 2048 chars
              var messagesToSend = [];
              var sendMsg = [];
              var msg = "";              
              mentions.forEach(function(mention) {
                  msg += mention;
                  sendMsg.push(mention);
                  if(msg.length > 1800) {
                      messagesToSend.push(sendMsg);
                      msg = "";
                      sendMsg = [];                    
                  }
              });

              //Append last
              messagesToSend.push(sendMsg);

              messagesToSend.forEach(function(msg) {
                  console.log("Sending...");
                  console.log(msg.join(" "));
                  message.channel.send({embed: richMsg("", msg.join("\n"), CONFIG.GOOD)});                        
              });

            }
          });
          return;
        }

        //Check pokemon name
        var name = args.shift(1);
        if(isNaN(name)) { //Pokemon name is string
          mysql.getPokemonByName(name, function(err, name_result) {
            if(err) console.log(err);
            else {
              switch(action) {
                  case "help":
                      var mentionHelp = [];
                      break;
                  case "add": // ?mention add name type mention
                        if(args.length != 2) {
                          console.log("Invalid # remaining args");
                          message.channel.send({embed: richMsg("", "Invalid # remaining args", CONFIG.ERROR)});
                        }
                        else {
                          var type = args.shift(1);
                          var mention = args.shift(1);

                          mysql.getMentionByName(name, function(err, mention_result) {
                            if(err) console.log(err);
                            else {
                              if(mention_result.length == 0) {
                                mysql.addMentionsEntry(name_result[0].pid, name_result[0].name, type, mention, function(err, add_result) {
                                  if(err) console.log(err);
                                  else { 
                                    message.channel.send({embed: richMsg("", "Mention for "+name+" added. ("+mention+")", CONFIG.GOOD)});
                                  }
                                });
                              }
                              else {
                                message.channel.send({embed: richMsg("", "Mention for "+name+" already exists: "+mention_result[0].mention, CONFIG.INFO)});
                              }
                            }
                          });
                        }
                      break;
                  case "remove": //?mention remove name
                        mysql.getMentionByName(name, function(err, mention_result) {
                          if(err) console.log(err);
                          else {
                            mysql.deleteMentionEntry(mention_result[0].pid, function(err, delete_result) {
                              if(err) console.log(err);
                              else {
                                 message.channel.send({embed: richMsg("", "Mention for "+name+" deleted.", CONFIG.GOOD)});
                              }
                            });
                          }
                        });
                        //Check if there is an entry already

                        //Remove entry
                      break;
                  case "show": //?mention show name
                      mysql.getMentionByName(name, function(err, mention_result) {
                        if(err) console.log(err);
                        else {
                          if(mention_result.length > 0) {
                            message.channel.send({embed: richMsg("", "Mention for "+name+": "+mention_result[0].mention, CONFIG.GOOD)});
                          }
                          else {
                            message.channel.send({embed: richMsg("", "Mention not found for "+name, CONFIG.ERROR)});
                          }                    
                        }
                      });
                      break;
              }
            } //else
          });
        }
      }
      else {
        message.channel.send({embed: richMsg("", "ADMIN ONLY COMMAND", CONFIG.ERROR)});
      }
    }


    if(message.content.startsWith(CONFIG.PREFIX+"mem")) {
      var args = message.content.split(/\s+/g).slice(1);
      var memberValue = args[0];
      var member = null;
      console.log(memberValue);

      getMember(bot, memberValue, function(resultMember) { member = resultMember; });

      console.log(member);

      //message.channel.send(member.id);
      //message.channel.send(member.username);
    }


    //.iam handles
    // helpers and future role replacement
    if(message.content.startsWith(".iam ") && CONFIG.IAM_RESPONDER) {
        var args = message.content.split(/\s+/g).slice(1);
        var pm = loadPokemonMentions();
        var rm = loadRaidMentions();

        //Hold message for removal
        var holdMessage = message;

        var pokemon = capitalizeFirstLetter(args[0]); //Capitalize first, just in case lowercase was sent in
        var found_pm = false;
        var found_rm = false;
        if(pokemon.search(/\-r$/) != -1) { //RAID mention search
            found_rm = objIndexSearch(rm, pokemon);
            if(found_rm === '') {
                console.log("Mention " + pokemon + " does not exist (Raids)");
                message.channel.send({embed: richMsg("", "Raid Mention Role for **" + pokemon + "** is not defined on this server.", CONFIG.ERROR)})
                    .then(dittoMessage => {
                        setTimeout(function() {
                            dittoMessage.delete(); 
                            holdMessage.delete();
                        }, 5000);
                    });
            }
        }
        else { // Pokemon mention search
            found_pm = objIndexSearch(pm, pokemon);
            if(found_pm === '') {
                console.log("Mention " + pokemon + " does not exist (Rares)");
                message.channel.send({embed: richMsg("", "Mention Role for **" + pokemon + "** is not defined on this server.", CONFIG.ERROR)})
                    .then(dittoMessage => {
                        setTimeout(function() {
                            dittoMessage.delete();
                            holdMessage.delete();
                        }, 5000);
                    });
            }
        }
    }


    //Fun stuff
    if(message.content.startsWith(CONFIG.PREFIX + "spawns")) {
      var args = message.content.split(/\s+/g).slice(1);
      var action = args[0];

      let BOT_MASTER = message.guild.roles.find("name", "bot master");
      if(message.member.roles.has(BOT_MASTER.id)) {
        switch (action) {
          case "stop":
              message.channel.send({embed: richMsg("Spawner", "Stopping all spawning.", CONFIG.GOOD)});
              break;
          case "start":
              message.channel.send({embed: richMsg("Spawner", "Starting spawners.", CONFIG.GOOD)});
              break;
          case "pokemon":
              message.channel.send({embed: richMsg("Spawner", "Starting to spawn more "+args[1])});
              break;
        }
      }
      else {
        message.channel.send({embed: richMsg("", "ADMIN ONLY COMMAND", CONFIG.ERROR)});
      }
    }


    //TESTING SUITE
    if (message.content.startsWith(CONFIG.PREFIX + "distance") && CONFIG.DISTANCE) {
        console.log("Distance calc triggered");
        var args = message.content.split(',');
        args[0] = args[0].replace(CONFIG.PREFIX+"distance", "");

        var source_lat = parseFloat(args[0].trim());
        var source_long = parseFloat(args[1].trim());
        var dest_lat = parseFloat(args[2].trim());
        var dest_long = parseFloat(args[3].trim());

        var result = distance(source_lat, source_long, dest_lat, dest_long);

        var lines = [];
        lines.push("**Source:** "+source_lat+","+source_long);
        lines.push("**Destination:** "+dest_lat+","+dest_long);
        lines.push("**Kilometers:** "+result);
        message.channel.send({ embed: richMsg("Distance calculation", lines.join("\n"), CONFIG.GOOD)});
    }


    //TESTS -- UNFINISHED
    if (false && message.content.startsWith(CONFIG.PREFIX + "sc") && CONFIG.SKIPCLEAR) {
        
        let SERVER_ADMIN = message.guild.roles.find("name", "Admin");
        let BOT_MASTER = message.guild.roles.find("name", "bot master");

        //Get request message
        var request_message = message.channel.lastMessage;
        request_message.delete();

        var args = message.content.split(/\s+/g).slice(1);
        if (args.length == 2 && !isNaN(args[0]) && !isNaN(args[1]) && (message.member.roles.has(BOT_MASTER.id) ||  message.member.roles.has(SERVER_ADMIN.id))) //should have two arguments 'skip amount' 'clear amount' i.e: ?sc 2 5
        {
    
            var skip = args[0];
            var clear = args[1];
            var msg_limit = +skip + +clear;
            console.log("Skip:  " + skip);
            console.log("Clear: " + clear);
            console.log("Msg limit: " + msg_limit);

            message.channel.fetchMessages({ limit: msg_limit })
                .then(
                    messages => {
                        //Loop over messages
                        var skipped = 0; //Starts with -1 to consider request message "?sc 2 2"
                        messages.forEach(function (message) {
                         
                            if (skipped < skip) { //Check if we are still skipping
                                skipped++;
                                return;
                            }
                            else {
                                //If we are past the skipped rows, delete
                                message.delete();
                            }
                        });
                    })
                .catch(console.error);
        }    
        else {
            message.channel.send({ embed: richMsg("Command Restriction!", "Admins Only", CONFIG.ERROR)});
        }
    }
});



/*
        var pokemons = pokemonMentions.get();
        var raids = raidMentions.get();

        console.log(pokemons);


        //Pokemon Mentions
        var msg = "**Example:**\nTo add type: **.iam snorlax** \nTo remove type: **.iamnot snorlax**\n\n";
        for (var key in pokemons) {
            if (pokemons.hasOwnProperty(key)) {
                if (pokemons[key].length > 0) msg += key + ", ";
            }
        }
        msg = msg.slice(0, -2);
        message.channel.send({ embed: richMsg("Pokemon Mentions List ( "+CONFIG.PREFIX+"pm )", msg, CONFIG.GOOD)})

        //Reset
        msg = "**Example:**\nTo add type: **.iam snorlax-r** \nTo remove type: **.iamnot snorlax-r**\n\n";

        //Raid mentions
        for (var key in raids) {
            if (raids.hasOwnProperty(key)) {
                if (raids[key].length > 0) msg += key + ", ";
            }
        }
        msg = msg.slice(0, -2);
        message.channel.send({ embed: richMsg("Raid Mentions List ( "+CONFIG.PREFIX+"rm )", msg, CONFIG.GOOD)})*/