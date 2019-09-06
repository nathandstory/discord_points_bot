//points bot for discord servers
//author: doopaderp

//Uses sqlite3 for storing points in a database that can be recalled when the program starts and stops.
const config = require("./config.json");
const Discord = require('discord.js');
const SQLite = require("better-sqlite3");
const Prompter = require('discordjs-prompter');
const sql = new SQLite('./scores.sqlite');
const client = new Discord.Client();
const master = config.masterID;
const singPoint = config.pointName;
const plurPoint = config.pointName + 's';

//Called once the bot is online.
client.once('ready', () => {
  console.log('Bot started');
 // Check if the table "points" exists.
  const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'scores';").get();
  if (!table['count(*)']) {
    // If the table isn't there, create it and setup the database correctly.
    sql.prepare("CREATE TABLE scores (id TEXT PRIMARY KEY, user TEXT, guild TEXT, points INTEGER);").run();
    // Ensure that the "id" row is always unique and indexed.
    sql.prepare("CREATE UNIQUE INDEX idx_scores_id ON scores (id);").run();
    sql.pragma("synchronous = 1");
    sql.pragma("journal_mode = wal");
  }
  // And then we have two prepared statements to get and set the score data.
  client.getScore = sql.prepare("SELECT * FROM scores WHERE user = ? AND guild = ?");
  client.setScore = sql.prepare("INSERT OR REPLACE INTO scores (id, user, guild, points) VALUES (@id, @user, @guild, @points);");
  //Send a message to the general chat that the bot is online.
  try{client.channels.get(config.channelToTalk).send('Bot Online!');}catch(err){console.log("No Channel Set")}
});

//When someone posts a message run this
client.on('message', message => {
//ignore bots, direct messages, and group messages
if (message.author.bot || !message.guild) return;
  //Beginning of score code and commands
  // Initialize ("declare") the points. If we did this in the condition it would not be
  // available later in commands. Because "scopes"! 
  let score;
  if (message.guild) {
    // Try to get the current user's point score. 
    score = client.getScore.get(message.author.id, message.guild.id);
    // If the score doesn't exist (new user), initialize with defaults. 
    if (!score) {
      score = { id: `${message.guild.id}-${message.author.id}`, user: message.author.id, guild: message.guild.id, points: 0 };
    }
    // Save data to the sqlite table. 
    // This looks super simple because it's calling upon the prepared statement!
    client.setScore.run(score);
  }
  if (message.content.indexOf(config.prefix) !== 0) return;
  //Parse the command
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  //--UPDATE-SCORE-------------------------------------------------------------------------------------------------------------------------------
  //Updates the score based on the recieved parameters
  const updateScore = (message, user, value, set = false) => {
    //Get the current points from the user whos score we are trying to change
    let userscore = client.getScore.get(user.id, message.guild.id);
    //Initiate defaults for users that may not be in the databse yet
    if (!userscore) userscore = { id: `${message.guild.id}-${user.id}`, user: user.id, guild: message.guild.id, points: 0 };
    //Adjust the score
    if(set) userscore.points = value;
    else userscore.points += value;
    //Set and Save the new score
    client.setScore.run(userscore);
    return console.log("Scores have been updated.");
  }

  //--/STANDING------------------------------------------------------------------------------------------------------------------------------------
  //Anyone can use this command - 
  //Tell the user how many points they have.
  if(command === "standing") {
    if (score.points == 1) return message.reply(`you currently have ${score.points} ${singPoint}.`)
    else return message.reply(`You currently have ${score.points} ${plurPoint}.`)
  }

  //--/VOTE----------------------------------------------------------------------------------------------------------------------------------------
  //Anyone can make a vote to give or remove points
  if(command === "vote"){
    //Get the subcommand (give/remove)
    const subCommand = args[0];
    if(!subCommand || !(subCommand === 'give' || subCommand === 'remove')) return message.reply("you must tell me to either 'give' or 'remove' points in a vote.");
    //get the user
    const user = message.mentions.users.first() || client.users.get(args[0]);
    if(!user) return message.reply("you must mention someone or give their ID!");
    //get the amount of points to add or remove
    const pointValue = parseInt(args[2], 10);
    if(!pointValue) return message.reply(`ylease specify an amount of ${plurPoint}.`);
    //--VOTE-EMBED-HANDLER-----------------------------------------------------------------------------
    Prompter.vote(message.channel, {
      question: `Should ${user} ${(subCommand === 'give')?('receive'):('lose')} ${pointValue} ${(pointValue === 1)?(singPoint):(plurPoint)}?`,
      choices: ['✅', '❌'],
      timeout: 30000,
    }).then((response) => {
      const winner = response.emojis[0];
      //if the vote passe
      if(winner.emoji === '✅') 
      {
        message.channel.send(`The vote to ${(subCommand === 'give')?('give'):('take away')} ${pointValue} ${(pointValue === 1)?(singPoint):(plurPoint)} ${(subCommand === 'give')?('to'):('from')} ${user} has passed`);
        if(subCommand === "give") return updateScore(message, user, pointValue);
        else if(subCommand === "remove") return updateScore(message, user, -pointValue);
        else console.log("Vote changes failed to update");
      }
      //if the vote fails
      if(winner.emoji === '❌') 
        message.channel.send(`The vote to ${(subCommand === 'give')?('give'):('take away')} ${pointValue} ${(pointValue === 1)?(singPoint):(plurPoint)} ${(subCommand === 'give')?('to'):('from')} ${user} has failed`);
    });
  }

  //--/GIVE-----------------------------------------------------------------------------------------------------------------------------------------
  //Owner and Master only - Give points
  if(command === "give") {
    // Limited to guild owner or master id
    if(!((message.author.id === message.guild.owner.id) || (message.author.id === master))) return message.reply("sorry champ you can't do that!");
    // Try to get the user from mention. If not found, get the ID given and get a user from that ID. 
    const user = message.mentions.users.first() || client.users.get(args[0]);
    if(!user) return message.reply("you must mention someone or give their ID!");
    // Read the amount of points to give to the user. 
    const pointsToAdd = parseInt(args[1], 10);
    if(!pointsToAdd) return message.reply(`you didn't tell me how many ${plurPoint} to give...`);
    //update the score
    updateScore(message, user, pointsToAdd);
    //Test for plural or singular points
    if (pointsToAdd != 1)return message.channel.send(`${user.tag} has received ${pointsToAdd} ${plurPoint}.`);
    else return message.channel.send(`${user.tag} has received ${pointsToAdd} ${singPoint}.`);
  }
  
  //--/REMOVE-------------------------------------------------------------------------------------------------------------------------------------------
  //Owner and Master only - Remove Points
  if(command === "remove") {
    // Limited to guild owner and master id.
    if(!((message.author.id === message.guild.owner.id) || (message.author.id === master))) return message.reply("sorry champ you can't do that!");
    // Try to get the user from mention. If not found, get the ID given and get a user from that ID. 
    const user = message.mentions.users.first() || client.users.get(args[0]);
    if(!user) return message.reply("you must mention someone or give their ID!");
    // Read the amount of points to remove from the user. 
    const pointsToRemove = parseInt(args[1], 10);
    if(!pointsToRemove) return message.reply(`you didn't tell me how many ${plurPoint} to remove...`);
    //update the score
    updateScore(message, user, -pointsToRemove);
    //Test for plural or singular points
    if (pointsToRemove != 1)return message.channel.send(`${user.tag} has lost ${pointsToRemove} ${plurPoint}.`);
    else return message.channel.send(`${user.tag} has lost ${pointsToRemove} ${singPoint}.`);
  }
    
  //--/SET---------------------------------------------------------------------------------------------------------------------------------------------  
  //Owner and Master Only - Set points (try to avoid using this, its a boring command for corrective purposes only)
  if(command === "set") {
    // Limited to guild owner or master id
    if(!((message.author.id === message.guild.owner.id) || (message.author.id === master))) return message.reply("sorry champ you can't do that!");
    // Try to get the user from mention. If not found, get the ID given and get a user from that ID. 
    const user = message.mentions.users.first() || client.users.get(args[0]);
    if(!user) return message.reply("you must mention someone or give their ID!");
    // Read the amount of points to give to the user. 
    const pointsToSet = parseInt(args[1], 10);
    if(!pointsToSet) return message.reply(`you didn't tell me what to set their ${plurPoint} to...`);
    //update the score
    updateScore(message, user, pointsToSet, true);
    //Test for plural or singular points
    return message.channel.send(`${user.tag}'s ${plurPoint} has been set to ${pointsToSet}.`);
  }

  //--/LEADERBOARD--------------------------------------------------------------------------------------------------------------------------------------
  //Anyone can use the leader board command - shows standings sorted by point values
  if(command === "leaderboard") {
    // Grab the top 10
    const top10 = sql.prepare("SELECT * FROM scores WHERE guild = ? ORDER BY points DESC LIMIT 10;").all(message.guild.id);

    //Make it look good
    const embed = new Discord.RichEmbed()
      .setTitle("Leaderboard")
      .setDescription(`The top ${singPoint} holders:`)
      .setColor(0x00AE86);

    for(const data of top10) {
      embed.addField(client.users.get(data.user).tag, `${data.points} ${(data.points === 1)?(singPoint):(plurPoint)}`);
    }
    return message.channel.send({embed});
  }

  //--/HELP---------------------------------------------------------------------------------------------------------------------------------------------  
  //Available to anyone - shows all available commands and embeds them to look nice
  if(command === "help") {
   const embed = new Discord.RichEmbed()
   .setTitle("Available Commands:")
   .setColor(0x00AE86);

   embed.addField("/standing", `Tells you how many ${plurPoint} you currently have.`);
   embed.addField("/vote", `Allows you to make a vote to give or remove ${plurPoint} from an individual.`);
   embed.addField("/leaderboard", `Shows the top ${singPoint} holders.`);
   embed.addField("/give", `Gives an individual ${plurPoint}. Requires permissions.`);
   embed.addField("/remove", `Takes an individual's ${plurPoint}. Requires permissions.`);
   embed.addField("/set", `Sets an individual's ${plurPoint}. Requires permissions.`);

   return message.channel.send({embed});
  }
})

client.login(config.token)
