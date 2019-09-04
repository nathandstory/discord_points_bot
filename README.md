# discord_points_bot
A sqlite3 based discord reputation bot


Include a config.json with the contents:

```
{
  "token"  : "<Insert discord token here>",
  "prefix" : "/",
  "channelToTalk" : "<Insert channel Id for bot alerts>"
}
```
The prefix character is what will determine if the discord bot detects a command or not. 

To run on a local server, make sure you have python 2.7 and build-essentials.
