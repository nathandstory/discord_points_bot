# discord_points_bot
A sqlite3 based discord reputation/voting bot


Include a config.json with the contents:

```
{
  "token"  : "<Discord Token Key Here>",
  "prefix" : "/",
  "masterID" : "<Insert a Master ID that overrides all permissions if needed>",
  "channelToTalk" : "<Channel For bot speak(optional and silent if left blank)>",
  "pointName" : "Point",
  "roleToUse" : "PointHaver"
}
```
The prefix character is what will determine if the discord bot detects a command or not. 

The name of the point system can be changed now. Simple include a singular version of the reputation system you'd like to use and it handles singular and plurals on its own. Ex: 'Point','Star','Credit'

RoleToUse applies a role to anyone with 1 or more points, and removes it if they go back to 0.

To run on a local server, make sure you have python 2.7 and build-essentials.


For Windows:
```
npm i --vs2015 -g windows-build-tools
```

For Linux:
```
sudo apt-get install build-essential
```

and then if node-gyp and better-sqlite3 arent installed yet use:
```
npm i node-gyp better-sqlite3
```
