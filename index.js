//points bot for discord servers
//author: doopaderp

//Uses sqlite3 for storing points in a database that can be recalled when the program starts and stops.
const config = require("./config.json");
const Discord = require('discord.js')
const client = new Discord.Client()
const SQLite = require("better-sqlite3");
const sql = new SQLite('./scores.sqlite');
const master = '<input master discord id here (optional)>';

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
  client.channels.get(config.channelToTalk).send('Bot Online!');
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

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if(command === "points") {
    return message.reply(`You currently have ${score.points} points.`);
  }
  
  if(command === "give") {
    // Limited to guild owner or master id
    if(!((message.author.id === message.guild.owner.id) || (message.author.id === master))) return message.reply("Sorry champ you can't do that!");
  
    // Try to get the user from mention. If not found, get the ID given and get a user from that ID. 
    const user = message.mentions.users.first() || client.users.get(args[0]);
    if(!user) return message.reply("You must mention someone or give their ID!");
  
    // Read the amount of points to give to the user. 
    const pointsToAdd = parseInt(args[1], 10);
    if(!pointsToAdd) return message.reply("You didn't tell me how many points to give...");
  
    // Get their current points. This can't use `score` because it's not the same user ;)
    let userscore = client.getScore.get(user.id, message.guild.id);
    
    // It's possible to give points to a user we haven't seen, so we need to initiate defaults here too!
    if (!userscore) {
      userscore = { id: `${message.guild.id}-${user.id}`, user: user.id, guild: message.guild.id, points: 0 };
    }
    
    // Increment the score. 
    userscore.points += pointsToAdd;
  
    // And we save it!
    client.setScore.run(userscore);
    
    //Test for plural or singular points
    if (pointsToAdd != 1)return message.channel.send(`${user.tag} has received ${pointsToAdd} points.`);
    else return message.channel.send(`${user.tag} has received ${pointsToAdd} point.`);
  }
  
  if(command === "remove") {
    // Limited to guild owner and master id.
    if(!((message.author.id === message.guild.owner.id) || (message.author.id === master))) return message.reply("Sorry champ you can't do that!");
  
    // Try to get the user from mention. If not found, get the ID given and get a user from that ID. 
    const user = message.mentions.users.first() || client.users.get(args[0]);
    if(!user) return message.reply("You must mention someone or give their ID!");
  
    // Read the amount of points to remove from the user. 
    const pointsToRemove = parseInt(args[1], 10);
    if(!pointsToRemove) return message.reply("You didn't tell me how many points to remove...");
  
    // Get their current points. This can't use `score` because it's not the same user.
    let userscore = client.getScore.get(user.id, message.guild.id);
    
    // It's possible to give points to a user we haven't seen, so we need to initiate defaults here too!
    if (!userscore) {
      userscore = { id: `${message.guild.id}-${user.id}`, user: user.id, guild: message.guild.id, points: 0 };
    }
    
    // Increment the score. 
    userscore.points -= pointsToRemove;
  
    // And we save it!
    client.setScore.run(userscore);
	
    //Test for plural or singular points
    if (pointsToRemove != 1)return message.channel.send(`${user.tag} has lost ${pointsToRemove} points.`);
    else return message.channel.send(`${user.tag} has received ${pointsToRemove} point.`);
  }
  
  if(command === "leaderboard") {
    // Grab the top 10
    const top10 = sql.prepare("SELECT * FROM scores WHERE guild = ? ORDER BY points DESC LIMIT 10;").all(message.guild.id);

    //Make it look good
    const embed = new Discord.RichEmbed()
      .setTitle("Leaderboard")
      .setAuthor(client.user.username, client.user.avatarURL)
      .setDescription("The top point holders:")
      .setColor(0x00AE86);

    for(const data of top10) {
      embed.addField(client.users.get(data.user).tag, `${data.points} points`);
    }
    return message.channel.send({embed});
  }

})

client.login(config.token)
